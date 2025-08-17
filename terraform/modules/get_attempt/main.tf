variable "attempts_table_arn" {
  type = string
}

variable "attempts_table_name" {
  type = string
}

variable "quizzes_table_arn" {
  type = string
}

variable "quizzes_table_name" {
  type = string
}

resource "aws_iam_role" "get_attempt_exec" {
  name = "get_attempt_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "get_attempt_policy" {
  role = aws_iam_role.get_attempt_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "get_attempt_dynamodb" {
  name = "get_attempt_dynamodb_policy"
  role = aws_iam_role.get_attempt_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem"]
        Resource = [var.attempts_table_arn, var.quizzes_table_arn]
      }
    ]
  })
}

resource "aws_lambda_function" "get_attempt" {
  function_name = "get_attempt"
  role = aws_iam_role.get_attempt_exec.arn
  handler = "lambda_function.lambda_handler"
  runtime = "python3.9"
  filename = "../backend/get_attempt01.zip"
  timeout = 15
  environment {
    variables = {
      ATTEMPTS_TABLE = var.attempts_table_name
      QUIZZES_TABLE = var.quizzes_table_name
    }
  }
}

output "get_attempt_invoke_arn" {
  value = aws_lambda_function.get_attempt.invoke_arn
}