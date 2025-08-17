import json
import boto3
import os
import uuid
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        quiz_id = event['pathParameters']['quiz_id']
        body = json.loads(event['body'])
        user_answers = body.get('answers', {})
        user_id = event['requestContext']['authorizer']['claims']['sub']

        quizzes_table = dynamodb.Table(os.environ['QUIZZES_TABLE'])
        attempts_table = dynamodb.Table(os.environ['ATTEMPTS_TABLE'])

        logger.info(f"Fetching quiz with ID: {quiz_id}")
        quiz_response = quizzes_table.get_item(Key={'quiz_id': quiz_id})
        quiz = quiz_response.get('Item')
        if not quiz:
            logger.error("Quiz not found")
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Quiz not found'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                }
            }

        quiz_content = quiz['quiz_content']
        if isinstance(quiz_content, str):
            quiz_content = json.loads(quiz_content)

        if isinstance(quiz_content, dict) and 'quiz' in quiz_content:
            quiz_content = quiz_content['quiz']

        correct_answers = {str(i): q['correct_answer'] for i, q in enumerate(quiz_content)}
        user_answers_str = {str(k): v for k, v in user_answers.items()}
        score = sum(1 for q_idx, ans in user_answers_str.items() if ans == correct_answers.get(q_idx))

        attempt_id = str(uuid.uuid4())
        attempts_table.put_item(Item={
            'attempt_id': attempt_id,
            'quiz_id': quiz_id,
            'user_id': user_id,
            'score': score,
            'total_questions': len(quiz_content),
            'answers': user_answers_str,
            'correct_answers': correct_answers
        })

        # Increment attempt count in Quizzes table
        quizzes_table.update_item(
            Key={'quiz_id': quiz_id},
            UpdateExpression="SET attempt_count = if_not_exists(attempt_count, :zero) + :one",
            ExpressionAttributeValues={
                ':zero': 0,
                ':one': 1
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'score': score, 'total': len(quiz_content), 'attempt_id': attempt_id}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
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
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            }
        }