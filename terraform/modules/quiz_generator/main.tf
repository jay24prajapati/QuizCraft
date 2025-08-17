variable "sqs_queue_arn" {
  type        = string
  description = "ARN of the SQS queue for quiz generation"
}

variable "sqs_queue_url" {
  type        = string
  description = "URL of the SQS queue for quiz generation"
}

variable "quizzes_table_arn" {
  type        = string
  description = "ARN of the DynamoDB Quizzes table"
}

variable "quizzes_table_name" {
  type        = string
  description = "Name of the DynamoDB Quizzes table"
}

variable "s3_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for PDFs"
}

variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for PDFs"
}

variable "sns_topic_arn" {
  type        = string
  description = "ARN of the SNS topic for notifications"
}

resource "aws_iam_role" "quiz_generator_exec" {
  name = "quiz_generator_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "quiz_generator_policy" {
  role       = aws_iam_role.quiz_generator_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "quiz_generator_sqs_dynamodb_s3" {
  name   = "quiz_generator_sqs_dynamodb_s3_policy"
  role   = aws_iam_role.quiz_generator_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem"
        ]
        Resource = var.quizzes_table_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "quizcraft/openai_api_key"
}

resource "aws_secretsmanager_secret_version" "openai_api_key_version" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = "XXX"
}

resource "aws_iam_role_policy" "quiz_generator_secrets" {
  name   = "quiz_generator_secrets_policy"
  role   = aws_iam_role.quiz_generator_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = aws_secretsmanager_secret.openai_api_key.arn
    }]
  })
}

resource "aws_lambda_function" "quiz_generator" {
  function_name = "quiz_generator"
  role          = aws_iam_role.quiz_generator_exec.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  filename      = "../backend/quiz_generator12.zip"
  timeout       = 60
  environment {
    variables = {
      S3_BUCKET      = var.s3_bucket_name
      SQS_QUEUE_URL  = var.sqs_queue_url
      QUIZZES_TABLE  = var.quizzes_table_name
      OPENAI_API_KEY = aws_secretsmanager_secret.openai_api_key.arn
      SNS_TOPIC_ARN  = var.sns_topic_arn
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.quiz_generator.arn
  batch_size       = 1
}

resource "aws_cloudwatch_metric_alarm" "quiz_generator_errors" {
  alarm_name          = "QuizGeneratorErrors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Alarm when quiz_generator Lambda has errors"
  alarm_actions       = [var.sns_topic_arn]
  dimensions = {
    FunctionName = aws_lambda_function.quiz_generator.function_name
  }
}

output "quiz_generator_arn" {
  value = aws_lambda_function.quiz_generator.arn
}