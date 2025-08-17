import json
import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns = boto3.client('sns')

def lambda_handler(event, context):
    try:
        user_email = event['request']['userAttributes']['email']
        user_id = event['request']['userAttributes']['sub'] 
        sns_topic_arn = os.environ['SNS_TOPIC_ARN']

        # Check if a subscription already exists for the user's email with the same filter policy
        subscriptions = sns.list_subscriptions_by_topic(TopicArn=sns_topic_arn)
        logger.info(f"Existing subscriptions for topic {sns_topic_arn}: {subscriptions['Subscriptions']}")
        for sub in subscriptions['Subscriptions']:
            if sub['Protocol'] == 'email' and sub['Endpoint'] == user_email:
                # Check filter policy
                attributes = sns.get_subscription_attributes(SubscriptionArn=sub['SubscriptionArn'])
                filter_policy = attributes.get('Attributes', {}).get('FilterPolicy')
                if filter_policy:
                    filter_policy_dict = json.loads(filter_policy)
                    if filter_policy_dict.get('user_id') == [user_id]:
                        logger.info(f"Subscription already exists for user {user_id} with ARN {sub['SubscriptionArn']}")
                        return event

        # Subscribe the user's email to the SNS topic with a filter policy using Cognito sub
        response = sns.subscribe(
            TopicArn=sns_topic_arn,
            Protocol='email',
            Endpoint=user_email,
            Attributes={
                'FilterPolicy': json.dumps({'user_id': [user_id]})
            }
        )

        logger.info(f"Subscription ARN: {response['SubscriptionArn']} for user {user_id}")
        return event
    except Exception as e:
        logger.error(f"Error subscribing user to SNS: {str(e)}")
        return event