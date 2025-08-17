variable "quizzes_table_arn" {
  type        = string
  description = "ARN of the DynamoDB Quizzes table"
}

variable "quizzes_table_name" {
  type        = string
  description = "Name of the DynamoDB Quizzes table"
}

resource "aws_iam_role" "get_quizzes_exec" {
  name = "get_quizzes_exec_role"
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

resource "aws_iam_role_policy_attachment" "get_quizzes_policy" {
  role       = aws_iam_role.get_quizzes_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "get_quizzes_dynamodb" {
  name   = "get_quizzes_dynamodb_policy"
  role   = aws_iam_role.get_quizzes_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:Query",
        "dynamodb:GetItem"
      ]
      Resource = [
        var.quizzes_table_arn,
        "${var.quizzes_table_arn}/index/*"
      ]
    }]
  })
}

resource "aws_lambda_function" "get_quizzes" {
  function_name = "get_quizzes"
  role          = aws_iam_role.get_quizzes_exec.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  filename      = "../backend/get_quizzes02.zip"  
  timeout       = 15
  environment {
    variables = {
      QUIZZES_TABLE = var.quizzes_table_name
    }
  }
}

output "get_quizzes_invoke_arn" {
  value = aws_lambda_function.get_quizzes.invoke_arn
}