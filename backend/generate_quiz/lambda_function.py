import json
import boto3
import uuid
import os
import base64
import logging
from datetime import datetime
import hashlib
import PyPDF2
import openai
from io import BytesIO
import cgi

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        logger.info(f"Event: {json.dumps(event)}")

        # Initialize AWS clients
        secrets_client = boto3.client('secretsmanager')
        s3 = boto3.client('s3')
        sqs = boto3.client('sqs')
        dynamodb = boto3.resource('dynamodb')

        # Retrieve OpenAI API key
        secret_arn = os.environ.get('OPENAI_API_KEY')
        if not secret_arn:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        secret_value = secrets_client.get_secret_value(SecretId=secret_arn)
        openai.api_key = secret_value['SecretString']
        logger.info("OpenAI API key retrieved successfully")

        # Environment variables
        required_vars = ['S3_BUCKET', 'SQS_QUEUE_URL', 'QUIZZES_TABLE', 'TOPICS_TABLE']
        s3_bucket, sqs_queue_url, quizzes_table_name, topics_table_name = [
            os.environ.get(var) for var in required_vars
        ]
        if not all([s3_bucket, sqs_queue_url, quizzes_table_name, topics_table_name]):
            missing = [var for var in required_vars if not os.environ.get(var)]
            raise ValueError(f"Missing environment variables: {', '.join(missing)}")

        quizzes_table = dynamodb.Table(quizzes_table_name)
        topics_table = dynamodb.Table(topics_table_name)

        # Parse request body
        body_raw = event.get('body', '')
        if not body_raw:
            raise ValueError("Request body is empty")

        headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
        content_type = headers.get('content-type', '')
        logger.info(f"Content-Type: {content_type}")

        if 'multipart/form-data' in content_type.lower():
            # Extract boundary
            boundary = content_type.split('boundary=')[1] if 'boundary=' in content_type else None
            if not boundary:
                raise ValueError("Boundary not found in Content-Type header")

            # Decode body if base64 encoded
            body_bytes = base64.b64decode(body_raw) if event.get('isBase64Encoded', False) else body_raw.encode('utf-8')

            # Use cgi.FieldStorage to parse multipart form data
            environ = {
                'REQUEST_METHOD': 'POST',
                'CONTENT_TYPE': content_type,
                'CONTENT_LENGTH': len(body_bytes),
            }
            form = cgi.FieldStorage(fp=BytesIO(body_bytes), environ=environ)

            # Extract PDF file
            if 'pdf' in form:
                pdf_field = form['pdf']
                if pdf_field.file:
                    pdf_data = pdf_field.file.read()
                    logger.info(f"Extracted PDF data of size {len(pdf_data)} bytes")
                    body = pdf_data
                else:
                    raise ValueError("No PDF file found in request")
            else:
                raise ValueError("No PDF file found in request")
        else:
            try:
                body_str = (
                    body_raw if not event.get('isBase64Encoded', False)
                    else base64.b64decode(body_raw).decode('utf-8', errors='ignore')
                )
                body = json.loads(body_str)
            except json.JSONDecodeError as e:
                raise ValueError(e)

        # Extract user ID from Cognito authorizer
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        if not user_id:
            raise ValueError("User ID not found in authorizer claims")
        logger.info(f"User ID: {user_id}")

        quiz_id = str(uuid.uuid4())

        # Handle quiz regeneration
        if isinstance(body, dict) and body.get('regenerate') and 'topic_id' in body:
            topic_id = body['topic_id']
            if not isinstance(topic_id, str) or not topic_id.strip():
                raise ValueError("Invalid topic_id for regeneration")
            topic_response = topics_table.get_item(Key={'user_id': user_id, 'topic_id': topic_id})
            topic = topic_response.get('Item')
            if not topic:
                return error_response(404, "Topic not found")
            source = topic['source']
            s3_key = topic.get('s3_key') if source == 'pdf' else None
            topic_name = topic['name']
            quizzes_table.put_item(Item={
                'quiz_id': quiz_id,
                'user_id': user_id,
                'topic_id': topic_id,
                'topic_name': topic_name,
                'status': 'pending',
                's3_key': s3_key,
                'attempt_count': 0,
                'created_at': datetime.utcnow().isoformat() + 'Z'
            })
            send_sqs_message(sqs, sqs_queue_url, quiz_id, user_id, topic_id, source, s3_key, topic_name)
            return success_response("Quiz regeneration queued")

        # Handle new quiz generation
        if isinstance(body, bytes):  # PDF upload
            pdf_bytes = body
            pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
            source = "pdf"
            response = topics_table.query(
                IndexName='UniqueSourceIndex',
                KeyConditionExpression='user_id = :uid AND source_identifier = :sid',
                ExpressionAttributeValues={':uid': user_id, ':sid': f"pdf_{pdf_hash}"}
            )
            if response.get('Items'):
                topic_id = response['Items'][0]['topic_id']
                return error_response(400, "This PDF has already been used", {'topic_id': topic_id})
            s3_key = f"quizzes/{quiz_id}.pdf"
            s3.put_object(Bucket=s3_bucket, Key=s3_key, Body=pdf_bytes)
            pdf_text = extract_pdf_text(s3, s3_bucket, s3_key)  # Pass s3 client
            generated_name = generate_topic_name(pdf_text)
            name = ensure_unique_name(user_id, generated_name, topics_table)
            topic_id = str(uuid.uuid4())
            topics_table.put_item(Item={
                'user_id': user_id,
                'topic_id': topic_id,
                'name': name,
                'source': 'pdf',
                'pdf_hash': pdf_hash,
                's3_key': s3_key,
                'source_identifier': f"pdf_{pdf_hash}",
                'created_at': datetime.utcnow().isoformat() + 'Z'
            })
        elif isinstance(body, dict) and 'topic' in body:  # Topic input
            provided_topic = body['topic'].strip()
            if not provided_topic:
                raise ValueError("Topic cannot be empty")
            source = "topic"
            response = topics_table.query(
                IndexName='UniqueSourceIndex',
                KeyConditionExpression='user_id = :uid AND source_identifier = :sid',
                ExpressionAttributeValues={':uid': user_id, ':sid': f"topic_{provided_topic}"}
            )
            if response.get('Items'):
                topic_id = response['Items'][0]['topic_id']
                return error_response(400, "Topic already exists", {'topic_id': topic_id})
            topic_id = str(uuid.uuid4())
            topics_table.put_item(Item={
                'user_id': user_id,
                'topic_id': topic_id,
                'name': provided_topic,
                'source': 'topic',
                'source_identifier': f"topic_{provided_topic}",
                'created_at': datetime.utcnow().isoformat() + 'Z'
            })
            name = provided_topic
        else:
            raise ValueError("Invalid input: Expected 'pdf' (binary) or 'topic' (JSON)")

        quizzes_table.put_item(Item={
            'quiz_id': quiz_id,
            'user_id': user_id,
            'topic_id': topic_id,
            'topic_name': name,
            'status': 'pending',
            's3_key': s3_key if source == 'pdf' else None,
            'attempt_count': 0,
            'created_at': datetime.utcnow().isoformat() + 'Z'
        })

        send_sqs_message(sqs, sqs_queue_url, quiz_id, user_id, topic_id, source, s3_key if source == 'pdf' else None, name)
        return success_response("Quiz generation queued")

    except Exception as e:
        logger.error(f"Internal server error: {str(e)}", exc_info=True)
        return error_response(500, f"Internal server error: {str(e)}")

def extract_pdf_text(s3, s3_bucket, s3_key):
    """Extract text from the first page of a PDF, ensuring UTF-8 compatibility."""
    try:
        obj = s3.get_object(Bucket=s3_bucket, Key=s3_key)
        pdf_data = obj['Body'].read()
        pdf_file = BytesIO(pdf_data)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages[:1]:  
            page_text = page.extract_text() or ""
            text += page_text.encode('utf-8', errors='ignore').decode('utf-8')
        logger.info(f"Extracted text length: {len(text)}")
        if not text.strip():
            raise ValueError("No text extracted from PDF")
        return text
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}", exc_info=True)
        raise ValueError(f"Failed to extract PDF text: {str(e)}")

def generate_topic_name(text):
    """Generate a concise topic name using OpenAI."""
    try:
        prompt = f"Generate a concise topic name based on the following text:\n\n{text[:1000]}"
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0.5,
        )
        name = response.choices[0].message['content'].strip()
        if not name:
            raise ValueError("OpenAI returned an empty topic name")
        logger.info(f"Generated topic name: {name}")
        return name
    except Exception as e:
        logger.error(f"Error generating topic name: {str(e)}", exc_info=True)
        return "Untitled Topic"

def ensure_unique_name(user_id, name, topics_table):
    """Ensure topic name is unique for the user."""
    try:
        response = topics_table.query(
            IndexName='UniqueSourceIndex',  
            KeyConditionExpression='user_id = :uid AND begins_with(source_identifier, :sid)',
            ExpressionAttributeValues={':uid': user_id, ':sid': f"topic_{name}"}
        )
        if response.get('Items'):
            count = len(response['Items'])
            return f"{name} ({count + 1})"
        return name
    except Exception as e:
        logger.error(f"Error ensuring unique name: {str(e)}", exc_info=True)
        return name

def send_sqs_message(sqs, queue_url, quiz_id, user_id, topic_id, source, s3_key, topic_name):
    """Send message to SQS for quiz generation."""
    try:
        message_body = {
            'quiz_id': quiz_id,  
            'user_id': user_id,
            'topic_id': topic_id,
            'source': source,
            'topic_name': topic_name
        }
        if s3_key:
            message_body['s3_key'] = s3_key
        sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message_body))
        logger.info(f"SQS message sent for quiz_id: {quiz_id}")
    except Exception as e:
        logger.error(f"Failed to send SQS message: {str(e)}", exc_info=True)
        raise

def success_response(message):
    """Return a successful HTTP response."""
    return {
        'statusCode': 200,
        'body': json.dumps({'message': message}),
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        }
    }

def error_response(status_code, message, additional_data=None):
    """Return an error HTTP response."""
    body = {'error': message}
    if additional_data:
        body.update(additional_data)
    return {
        'statusCode': status_code,
        'body': json.dumps(body),
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        }
    }