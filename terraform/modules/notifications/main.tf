resource "aws_sns_topic" "quiz_notifications" {
  name = "quiz-notifications"
}

resource "aws_sns_topic_policy" "quiz_notifications_policy" {
  arn = aws_sns_topic.quiz_notifications.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "AllowEmailSubscriptions"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "sns:Subscribe",
          "sns:Publish"
        ]
        Resource = aws_sns_topic.quiz_notifications.arn
        Condition = {
          StringEquals = {
            "sns:Protocol" = "email"
          }
        }
      },
      {
        Sid = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sns:Publish"
        Resource = aws_sns_topic.quiz_notifications.arn
      }
    ]
  })
}

output "sns_topic_arn" {
  value = aws_sns_topic.quiz_notifications.arn
}