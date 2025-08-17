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

resource "aws_iam_role" "profile_exec" {
  name = "profile_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "profile_policy" {
  role = aws_iam_role.profile_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "profile_dynamodb" {
  name = "profile_dynamodb_policy"
  role = aws_iam_role.profile_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:Query", "dynamodb:Scan"]
        Resource = [
          var.quizzes_table_arn,
          "${var.quizzes_table_arn}/index/*",
          var.attempts_table_arn
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "profile" {
  function_name = "profile"
  role = aws_iam_role.profile_exec.arn
  handler = "lambda_function.lambda_handler"
  runtime = "python3.9"
  filename = "../backend/profile01.zip"
  timeout = 15
  environment {
    variables = {
      QUIZZES_TABLE = var.quizzes_table_name
      ATTEMPTS_TABLE = var.attempts_table_name
    }
  }
}

output "profile_invoke_arn" {
  value = aws_lambda_function.profile.invoke_arn
}