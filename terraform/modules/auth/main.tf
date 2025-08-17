variable "cloudfront_domain_name" {
  type = string
}

variable "sns_topic_arn" {
  type        = string
  description = "ARN of the SNS topic for notifications"
}

resource "aws_cognito_user_pool" "quizcraft" {
  name = "quizcraft-user-pool"

  auto_verified_attributes = ["email"]

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your QuizCraft Verification Code"
    email_message        = "Thank you for signing up! Your verification code is {####}. Enter this code to verify your account."
  }

  lambda_config {
    post_confirmation = aws_lambda_function.subscribe_to_sns.arn
  }
}

resource "aws_cognito_user_pool_client" "quizcraft_client" {
  name                  = "quizcraft-client"
  user_pool_id          = aws_cognito_user_pool.quizcraft.id
  generate_secret       = false
  allowed_oauth_flows   = ["code", "implicit"]
  allowed_oauth_scopes  = ["email", "openid", "profile"]
  callback_urls         = ["https://${var.cloudfront_domain_name}/callback"]
  logout_urls           = ["https://${var.cloudfront_domain_name}/logout"]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_lambda_function" "subscribe_to_sns" {
  function_name = "subscribe_to_sns"
  role          = aws_iam_role.subscribe_to_sns_exec.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  filename      = "../backend/subscribe_to_sns03.zip"
  timeout       = 15
  environment {
    variables = {
      SNS_TOPIC_ARN = var.sns_topic_arn
    }
  }
}

resource "aws_iam_role" "subscribe_to_sns_exec" {
  name = "subscribe_to_sns_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "subscribe_to_sns_policy" {
  role       = aws_iam_role.subscribe_to_sns_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "subscribe_to_sns_sns" {
  name   = "subscribe_to_sns_sns_policy"
  role   = aws_iam_role.subscribe_to_sns_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = [
        "sns:Subscribe",
        "sns:ListSubscriptionsByTopic",
        "sns:GetSubscriptionAttributes"
      ]
      Resource = var.sns_topic_arn
    }]
  })
}

resource "aws_lambda_permission" "allow_cognito" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.subscribe_to_sns.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.quizcraft.arn
}

output "cognito_user_pool_arn" {
  value = aws_cognito_user_pool.quizcraft.arn
}