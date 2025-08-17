variable "quizzes_table_arn" {
  type = string
}

variable "quizzes_table_name" {
  type = string
}

variable "attempts_table_arn" {
  type = string
}

variable "attempts_table_name" {
  type = string
}

resource "aws_iam_role" "submit_quiz_exec" {
  name = "submit_quiz_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "submit_quiz_policy" {
  role = aws_iam_role.submit_quiz_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "submit_quiz_dynamodb" {
  name = "submit_quiz_dynamodb_policy"
  role = aws_iam_role.submit_quiz_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = var.quizzes_table_arn
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem"]
        Resource = var.attempts_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "submit_quiz" {
  function_name = "submit_quiz"
  role = aws_iam_role.submit_quiz_exec.arn
  handler = "lambda_function.lambda_handler"
  runtime = "python3.9"
  filename = "../backend/submit_quiz01.zip"
  timeout = 15
  environment {
    variables = {
      QUIZZES_TABLE = var.quizzes_table_name
      ATTEMPTS_TABLE = var.attempts_table_name
    }
  }
}

output "submit_quiz_invoke_arn" {
  value = aws_lambda_function.submit_quiz.invoke_arn
}