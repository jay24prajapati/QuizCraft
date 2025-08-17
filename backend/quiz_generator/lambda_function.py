import json
import boto3
import os
import logging
import openai
import PyPDF2
import io
import re

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
secrets_client = boto3.client('secretsmanager')
sns = boto3.client('sns')

def lambda_handler(event, context):
    try:
        logger.info("Event received: %s", json.dumps(event))

        secret_arn = os.environ.get('OPENAI_API_KEY')
        logger.info("Retrieving secret from ARN: %s", secret_arn)
        secret_value = secrets_client.get_secret_value(SecretId=secret_arn)
        openai.api_key = secret_value['SecretString']
        logger.info("OpenAI API key retrieved successfully")

        sns_topic_arn = os.environ.get('SNS_TOPIC_ARN')
        if not sns_topic_arn:
            logger.warning("SNS_TOPIC_ARN not set, notifications will be skipped")

        for record in event['Records']:
            try:
                message = json.loads(record['body'])
                quiz_id = message['quiz_id']
                user_id = message['user_id']
                topic_name = message.get('topic_name')
                s3_key = message.get('s3_key')
                source = message.get('source')
                logger.info("Processing quiz %s for user %s", quiz_id, user_id)

                s3_bucket = os.environ.get('S3_BUCKET')
                quizzes_table_name = os.environ.get('QUIZZES_TABLE')
                sqs_queue_url = os.environ.get('SQS_QUEUE_URL')
                if not all([s3_bucket, quizzes_table_name, sqs_queue_url]):
                    raise ValueError("Missing environment variables")

                if source == 'pdf':
                    logger.info("Extracting PDF text from %s", s3_key)
                    pdf_content = extract_pdf_text(s3_bucket, s3_key)
                    quiz_content = generate_quiz_content(pdf_content=pdf_content)
                else:
                    logger.info("Generating quiz for topic: %s", topic_name)
                    quiz_content = generate_quiz_content(topic=topic_name)

                table = dynamodb.Table(quizzes_table_name)
                logger.info("Updating DynamoDB for quiz %s", quiz_id)
                table.update_item(
                    Key={'quiz_id': quiz_id},
                    UpdateExpression="SET #status = :s, quiz_content = :c",
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':s': 'completed',
                        ':c': quiz_content
                    }
                )
                logger.info("DynamoDB updated for quiz %s", quiz_id)

                if sns_topic_arn:
                    sns.publish(
                        TopicArn=sns_topic_arn,
                        Message=f"Quiz '{topic_name}' (ID: {quiz_id}) has been generated successfully.",
                        Subject="QuizCraft: Quiz Generation Completed",
                        MessageAttributes={
                            'user_id': {
                                'DataType': 'String',
                                'StringValue': user_id
                            }
                        }
                    )
                    logger.info("SNS notification sent for quiz %s", quiz_id)

                logger.info("Deleting message from SQS for quiz %s", quiz_id)
                sqs.delete_message(
                    QueueUrl=sqs_queue_url,
                    ReceiptHandle=record['receiptHandle']
                )
                logger.info("Message deleted from SQS for quiz %s", quiz_id)
            except Exception as e:
                logger.error("Error processing quiz %s: %s", quiz_id, str(e))
                table = dynamodb.Table(quizzes_table_name)
                table.update_item(
                    Key={'quiz_id': quiz_id},
                    UpdateExpression="SET #status = :s, error_message = :e",
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':s': 'failed',
                        ':e': str(e)
                    }
                )
                if sns_topic_arn:
                    sns.publish(
                        TopicArn=sns_topic_arn,
                        Message=f"Quiz generation failed for '{topic_name}' (ID: {quiz_id}): {str(e)}",
                        Subject="QuizCraft: Quiz Generation Failed",
                        MessageAttributes={
                            'user_id': {
                                'DataType': 'String',
                                'StringValue': user_id
                            }
                        }
                    )
                raise

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Quiz generation processed'})
        }
    except Exception as e:
        logger.error("Error processing event: %s", str(e))
        raise

def generate_quiz_content(topic=None, pdf_content=None):
    try:
        if pdf_content:
            prompt = f"""
Generate a quiz with 5 multiple-choice questions based on the following PDF content. 
Each question should have 4 options and indicate the correct answer. 
Return the quiz as a JSON array with the following structure:
[
    {{
        "question": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correct_answer": "Correct option"
    }},
    ...
]

PDF content:
{pdf_content[:40000]}
"""
        else:
            prompt = f"""
Generate a quiz with 5 multiple-choice questions about {topic}. 
Each question should have 4 options and indicate the correct answer. 
Return the quiz as a JSON array with the following structure:
[
    {{
        "question": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correct_answer": "Correct option"
    }},
    ...
]
"""

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a quiz generator that returns valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        quiz_content = response.choices[0].message['content'].strip()

        json_match = re.search(r'\[.*\]', quiz_content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                parsed_content = json.loads(json_str)
                if isinstance(parsed_content, list) and all(
                    isinstance(q, dict) and "question" in q and "options" in q and "correct_answer" in q
                    for q in parsed_content
                ):
                    return parsed_content
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON: {e}, raw content: {quiz_content}")
        
        logger.error(f"Invalid JSON from OpenAI, raw content: {quiz_content}")
        return [
            {
                "question": "Error: Unable to generate quiz content",
                "options": ["N/A"],
                "correct_answer": "N/A"
            }
        ]
    except Exception as e:
        logger.error("Error generating quiz content: %s", str(e))
        raise

def extract_pdf_text(s3_bucket, s3_key):
    try:
        obj = s3.get_object(Bucket=s3_bucket, Key=s3_key)
        pdf_data = obj['Body'].read()
        pdf_file = io.BytesIO(pdf_data)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
        logger.info("Extracted text length: %d characters", len(text))
        if not text:
            raise ValueError("No text extracted from PDF")
        truncated_text = text[:40000]
        logger.info("Truncated to %d characters", len(truncated_text))
        return truncated_text
    except Exception as e:
        logger.error("Error extracting PDF text: %s", str(e))
        raise