import json
import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        quiz_id = event['pathParameters']['quiz_id']
        user_id = event['requestContext']['authorizer']['claims']['sub']
        table_name = os.environ['QUIZZES_TABLE']
        table = dynamodb.Table(table_name)

        response = table.get_item(Key={'quiz_id': quiz_id})
        item = response.get('Item')
        if not item or item['user_id'] != user_id:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Quiz not found or not authorized'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }

        table.delete_item(Key={'quiz_id': quiz_id})
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Quiz deleted successfully'}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
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
                'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            }
        }