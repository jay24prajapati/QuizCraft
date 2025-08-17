import json
import boto3
import logging
import os
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj)
    else:
        return obj

def lambda_handler(event, context):
    try:
        logger.info(f"Full Event: {json.dumps(event)}")
        
        user_id = (event.get('requestContext', {})
                  .get('authorizer', {})
                  .get('claims', {})
                  .get('sub'))
        if not user_id:
            logger.error("User ID not found in event")
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Unauthorized'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }

        table_name = os.environ.get('QUIZZES_TABLE')
        if not table_name:
            logger.error("QUIZZES_TABLE environment variable not set")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Server configuration error'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }

        table = dynamodb.Table(table_name)
        
        path_params = event.get('pathParameters', {})
        logger.info(f"Path Parameters: {path_params}")
        quiz_id = path_params.get('quiz_id') if path_params else None
        logger.info(f"Quiz ID: {quiz_id}")
        if quiz_id:
            logger.info(f"Fetching quiz with ID: {quiz_id}")
            response = table.get_item(Key={'quiz_id': quiz_id})
            item = response.get('Item')
            if not item:
                logger.warning(f"Quiz {quiz_id} not found")
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'Quiz not found'}),
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                    }
                }
            if item.get('user_id') != user_id:
                logger.warning(f"User {user_id} not authorized for quiz {quiz_id}")
                return {
                    'statusCode': 403,
                    'body': json.dumps({'error': 'Forbidden'}),
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                    }
                }
            item = convert_decimals(item)
            logger.info(f"Successfully fetched quiz {quiz_id}")
            return {
                'statusCode': 200,
                'body': json.dumps(item),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }
        else:
            logger.info(f"Fetching all quizzes for user: {user_id}")
            response = table.query(
                IndexName='UserIdIndex',
                KeyConditionExpression='user_id = :uid',
                ExpressionAttributeValues={':uid': user_id}
            )
            quizzes = response.get('Items', [])
            quizzes = convert_decimals(quizzes)
            logger.info(f"Found {len(quizzes)} quizzes for user {user_id}")
            return {
                'statusCode': 200,
                'body': json.dumps({'quizzes': quizzes}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }
    except Exception as e:
        logger.error(f"Error in Lambda execution: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f"Internal server error: {str(e)}"}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            }
        }