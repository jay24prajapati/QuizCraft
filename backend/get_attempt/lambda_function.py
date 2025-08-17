import json
import boto3
import os
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        attempt_id = event['pathParameters']['attempt_id']
        attempts_table = dynamodb.Table(os.environ['ATTEMPTS_TABLE'])
        quizzes_table = dynamodb.Table(os.environ['QUIZZES_TABLE'])

        attempt_response = attempts_table.get_item(Key={'attempt_id': attempt_id})
        attempt = attempt_response.get('Item')
        if not attempt:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Attempt not found'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }

        quiz_id = attempt['quiz_id']
        quiz_response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        quiz = quiz_response.get('Item')
        if not quiz:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Quiz not found'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }

        quiz_content = quiz['quiz_content']
        if isinstance(quiz_content, str):
            quiz_content = json.loads(quiz_content)
        if isinstance(quiz_content, dict) and 'quiz' in quiz_content:
            quiz_content = quiz_content['quiz']

        score = int(attempt['score']) if isinstance(attempt['score'], Decimal) else attempt['score']
        total_questions = int(attempt['total_questions']) if isinstance(attempt['total_questions'], Decimal) else attempt['total_questions']

        result = {
            'attempt_id': attempt_id,
            'quiz_id': quiz_id,
            'score': score,
            'total_questions': total_questions,
            'user_answers': attempt['answers'],
            'correct_answers': attempt['correct_answers'],
            'questions': quiz_content
        }

        return {
            'statusCode': 200,
            'body': json.dumps(result),
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