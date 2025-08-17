import json
import boto3
import os
import logging
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
        user_id = event['requestContext']['authorizer']['claims']['sub']
        quizzes_table = dynamodb.Table(os.environ['QUIZZES_TABLE'])
        attempts_table = dynamodb.Table(os.environ['ATTEMPTS_TABLE'])

        # Fetch quizzes
        quiz_response = quizzes_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        quizzes = quiz_response.get('Items', [])

        # Fetch attempts
        attempt_response = attempts_table.scan(
            FilterExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        attempts = attempt_response.get('Items', [])

        quizzes = convert_decimals(quizzes)
        attempts = convert_decimals(attempts)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'quizzes': quizzes,
                'attempts': attempts
            }),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            }
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            }
        }