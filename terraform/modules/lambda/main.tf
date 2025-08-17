variable "s3_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for PDFs"
}

variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for PDFs"
}

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

variable "topics_table_arn" {
  type        = string
  description = "ARN of the DynamoDB Topics table"
}

variable "topics_table_name" {
  type        = string
  description = "Name of the DynamoDB Topics table"
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_s3_sqs_dynamodb" {
  name   = "lambda_s3_sqs_dynamodb_policy"
  role   = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.sqs_queue_arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          var.quizzes_table_arn,
          "${var.quizzes_table_arn}/index/*",
          var.topics_table_arn,
          "${var.topics_table_arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:us-east-1:*:secret:quizcraft/openai_api_key-*"
      }
    ]
  })
}

resource "aws_lambda_function" "generate_quiz" {
  function_name = "generate_quiz"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  filename      = "../backend/generate_quiz21.zip"
  timeout       = 30
  environment {
    variables = {
      S3_BUCKET      = var.s3_bucket_name
      SQS_QUEUE_URL  = var.sqs_queue_url
      QUIZZES_TABLE  = var.quizzes_table_name
      TOPICS_TABLE   = var.topics_table_name
      OPENAI_API_KEY = "arn:aws:secretsmanager:us-east-1:601148044385:secret:quizcraft/openai_api_key-uISGhk"
    }
  }
}

output "generate_quiz_invoke_arn" {
  value = aws_lambda_function.generate_quiz.invoke_arn
}