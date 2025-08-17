variable "cognito_user_pool_arn" {
  type        = string
  description = "ARN of the Cognito User Pool for authentication"
}

variable "lambda_generate_quiz_invoke_arn" {
  type        = string
  description = "The invoke ARN of the Lambda function for quiz generation"
}

variable "lambda_get_quizzes_invoke_arn" {
  type        = string
  description = "The invoke ARN of the Lambda function for fetching quizzes"
}

variable "lambda_submit_quiz_invoke_arn" {
  type = string
}

variable "lambda_get_attempt_invoke_arn" {
  type = string
}

variable "lambda_delete_quiz_invoke_arn" {
  type = string
}

variable "lambda_profile_invoke_arn" {
  type = string
}

resource "aws_api_gateway_rest_api" "quizcraft_api" {
  name        = "QuizCraftAPI"
  description = "API for QuizCraft application"
  binary_media_types = ["multipart/form-data"]
}

resource "aws_api_gateway_resource" "quiz" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  parent_id   = aws_api_gateway_rest_api.quizcraft_api.root_resource_id
  path_part   = "quiz"
}

resource "aws_api_gateway_resource" "quiz_id" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  parent_id   = aws_api_gateway_resource.quiz.id
  path_part   = "{quiz_id}"
}

resource "aws_api_gateway_resource" "submit" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  parent_id   = aws_api_gateway_resource.quiz_id.id
  path_part   = "submit"
}

resource "aws_api_gateway_resource" "attempt" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  parent_id   = aws_api_gateway_rest_api.quizcraft_api.root_resource_id
  path_part   = "attempt"
}

resource "aws_api_gateway_resource" "attempt_id" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  parent_id   = aws_api_gateway_resource.attempt.id
  path_part   = "{attempt_id}"
}

resource "aws_api_gateway_resource" "profile" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  parent_id   = aws_api_gateway_rest_api.quizcraft_api.root_resource_id
  path_part   = "profile"
}

# POST /quiz (Generate Quiz)
resource "aws_api_gateway_method" "generate_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.quiz.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "generate_quiz_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.generate_quiz.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "generate_quiz_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.quiz.id
  http_method             = aws_api_gateway_method.generate_quiz.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_generate_quiz_invoke_arn
}

resource "aws_api_gateway_integration_response" "generate_quiz_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.generate_quiz.http_method
  status_code = aws_api_gateway_method_response.generate_quiz_200.status_code
  depends_on  = [aws_api_gateway_integration.generate_quiz_integration]
}

# GET /quiz (Fetch Quizzes)
resource "aws_api_gateway_method" "get_quizzes" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.quiz.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "get_quizzes_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.get_quizzes.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "get_quizzes_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.quiz.id
  http_method             = aws_api_gateway_method.get_quizzes.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_get_quizzes_invoke_arn
}

resource "aws_api_gateway_integration_response" "get_quizzes_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.get_quizzes.http_method
  status_code = aws_api_gateway_method_response.get_quizzes_200.status_code
  depends_on  = [aws_api_gateway_integration.get_quizzes_integration]
}

# OPTIONS /quiz (CORS)
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.options_integration]
}

# GET /quiz/{quiz_id} (Fetch Specific Quiz)
resource "aws_api_gateway_method" "get_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.quiz_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "get_quiz_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.get_quiz.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "get_quiz_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.quiz_id.id
  http_method             = aws_api_gateway_method.get_quiz.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_get_quizzes_invoke_arn
}

resource "aws_api_gateway_integration_response" "get_quiz_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.get_quiz.http_method
  status_code = aws_api_gateway_method_response.get_quiz_200.status_code
  depends_on  = [aws_api_gateway_integration.get_quiz_integration]
}

# DELETE /quiz/{quiz_id} (Delete Quiz)
resource "aws_api_gateway_method" "delete_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.quiz_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "delete_quiz_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.delete_quiz.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "delete_quiz_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.quiz_id.id
  http_method             = aws_api_gateway_method.delete_quiz.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_delete_quiz_invoke_arn
}

resource "aws_api_gateway_integration_response" "delete_quiz_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.delete_quiz.http_method
  status_code = aws_api_gateway_method_response.delete_quiz_200.status_code
  depends_on  = [aws_api_gateway_integration.delete_quiz_integration]
}

# OPTIONS /quiz/{quiz_id} (CORS for GET/DELETE)
resource "aws_api_gateway_method" "quiz_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.quiz_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "quiz_id_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.quiz_id_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "quiz_id_options_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.quiz_id_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "quiz_id_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.quiz_id.id
  http_method = aws_api_gateway_method.quiz_id_options.http_method
  status_code = aws_api_gateway_method_response.quiz_id_options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.quiz_id_options_integration]
}

# POST /quiz/{quiz_id}/submit (Submit Quiz)
resource "aws_api_gateway_method" "submit_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.submit.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "submit_quiz_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.submit.id
  http_method = aws_api_gateway_method.submit_quiz.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "submit_quiz_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.submit.id
  http_method             = aws_api_gateway_method.submit_quiz.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_submit_quiz_invoke_arn
}

resource "aws_api_gateway_integration_response" "submit_quiz_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.submit.id
  http_method = aws_api_gateway_method.submit_quiz.http_method
  status_code = aws_api_gateway_method_response.submit_quiz_200.status_code
  depends_on  = [aws_api_gateway_integration.submit_quiz_integration]
}

# OPTIONS /quiz/{quiz_id}/submit (CORS)
resource "aws_api_gateway_method" "submit_options" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.submit.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "submit_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.submit.id
  http_method = aws_api_gateway_method.submit_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "submit_options_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.submit.id
  http_method = aws_api_gateway_method.submit_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "submit_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.submit.id
  http_method = aws_api_gateway_method.submit_options.http_method
  status_code = aws_api_gateway_method_response.submit_options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.submit_options_integration]
}

# GET /attempt/{attempt_id} (Fetch Attempt)
resource "aws_api_gateway_method" "get_attempt" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.attempt_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "get_attempt_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.attempt_id.id
  http_method = aws_api_gateway_method.get_attempt.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "get_attempt_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.attempt_id.id
  http_method             = aws_api_gateway_method.get_attempt.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_get_attempt_invoke_arn
}

resource "aws_api_gateway_integration_response" "get_attempt_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.attempt_id.id
  http_method = aws_api_gateway_method.get_attempt.http_method
  status_code = aws_api_gateway_method_response.get_attempt_200.status_code
  depends_on  = [aws_api_gateway_integration.get_attempt_integration]
}

# OPTIONS /attempt/{attempt_id} (CORS for GET)
resource "aws_api_gateway_method" "attempt_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.attempt_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "attempt_id_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.attempt_id.id
  http_method = aws_api_gateway_method.attempt_id_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "attempt_id_options_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.attempt_id.id
  http_method = aws_api_gateway_method.attempt_id_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "attempt_id_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.attempt_id.id
  http_method = aws_api_gateway_method.attempt_id_options.http_method
  status_code = aws_api_gateway_method_response.attempt_id_options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.attempt_id_options_integration]
}

# GET /profile (Fetch Profile Data)
resource "aws_api_gateway_method" "get_profile" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_method_response" "get_profile_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.get_profile.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration" "get_profile_integration" {
  rest_api_id             = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id             = aws_api_gateway_resource.profile.id
  http_method             = aws_api_gateway_method.get_profile.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_profile_invoke_arn
}

resource "aws_api_gateway_integration_response" "get_profile_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.get_profile.http_method
  status_code = aws_api_gateway_method_response.get_profile_200.status_code
  depends_on  = [aws_api_gateway_integration.get_profile_integration]
}

# OPTIONS /profile (CORS)
resource "aws_api_gateway_method" "profile_options" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "profile_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "profile_options_200" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "profile_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  status_code = aws_api_gateway_method_response.profile_options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_integration.profile_options_integration]
}

resource "aws_api_gateway_authorizer" "cognito_authorizer" {
  name          = "CognitoAuthorizer"
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = [var.cognito_user_pool_arn]
}

resource "aws_api_gateway_deployment" "quizcraft_deployment" {
  rest_api_id = aws_api_gateway_rest_api.quizcraft_api.id
  triggers = {
    redeployment = sha256(jsonencode([
      aws_api_gateway_method.generate_quiz,
      aws_api_gateway_integration.generate_quiz_integration,
      aws_api_gateway_method.get_quizzes,
      aws_api_gateway_integration.get_quizzes_integration,
      aws_api_gateway_method.submit_quiz,
      aws_api_gateway_integration.submit_quiz_integration,
      aws_api_gateway_method.submit_options,
      aws_api_gateway_integration.submit_options_integration,
      aws_api_gateway_method.get_attempt,
      aws_api_gateway_integration.get_attempt_integration,
      aws_api_gateway_method.get_quiz,
      aws_api_gateway_integration.get_quiz_integration,
      aws_api_gateway_method.quiz_id_options,
      aws_api_gateway_integration.quiz_id_options_integration,
      aws_api_gateway_method.attempt_id_options,
      aws_api_gateway_integration.attempt_id_options_integration,
      aws_api_gateway_method.delete_quiz,
      aws_api_gateway_integration.delete_quiz_integration,
      aws_api_gateway_method.get_profile,
      aws_api_gateway_integration.get_profile_integration,
      aws_api_gateway_method.profile_options,
      aws_api_gateway_integration.profile_options_integration,
      aws_api_gateway_authorizer.cognito_authorizer,
      aws_api_gateway_method.options,
      aws_api_gateway_integration.options_integration
    ]))
  }
  depends_on = [
    aws_api_gateway_integration.generate_quiz_integration,
    aws_api_gateway_method.generate_quiz,
    aws_api_gateway_integration.get_quizzes_integration,
    aws_api_gateway_method.get_quizzes,
    aws_api_gateway_integration.submit_quiz_integration,
    aws_api_gateway_method.submit_quiz,
    aws_api_gateway_integration.submit_options_integration,
    aws_api_gateway_method.submit_options,
    aws_api_gateway_integration.get_attempt_integration,
    aws_api_gateway_method.get_attempt,
    aws_api_gateway_integration.get_quiz_integration,
    aws_api_gateway_method.get_quiz,
    aws_api_gateway_integration.quiz_id_options_integration,
    aws_api_gateway_method.quiz_id_options,
    aws_api_gateway_integration.attempt_id_options_integration,
    aws_api_gateway_method.attempt_id_options,
    aws_api_gateway_integration.delete_quiz_integration,
    aws_api_gateway_method.delete_quiz,
    aws_api_gateway_integration.get_profile_integration,
    aws_api_gateway_method.get_profile,
    aws_api_gateway_integration.profile_options_integration,
    aws_api_gateway_method.profile_options,
    aws_api_gateway_authorizer.cognito_authorizer,
    aws_api_gateway_integration.options_integration,
    aws_api_gateway_method.options
  ]
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.quizcraft_api.id
  stage_name    = "prod"
  deployment_id = aws_api_gateway_deployment.quizcraft_deployment.id
}

resource "aws_lambda_permission" "api_gateway_invoke_generate" {
  statement_id  = "AllowAPIGatewayInvokeGenerate"
  action        = "lambda:InvokeFunction"
  function_name = "generate_quiz"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/POST/quiz"
}

resource "aws_lambda_permission" "api_gateway_invoke_get" {
  statement_id  = "AllowAPIGatewayInvokeGet"
  action        = "lambda:InvokeFunction"
  function_name = "get_quizzes"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/GET/quiz"
}

resource "aws_lambda_permission" "api_gateway_invoke_get_quiz" {
  statement_id  = "AllowAPIGatewayInvokeGetQuiz"
  action        = "lambda:InvokeFunction"
  function_name = "get_quizzes"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/GET/quiz/*"
}

resource "aws_lambda_permission" "api_gateway_invoke_submit" {
  statement_id  = "AllowAPIGatewayInvokeSubmit"
  action        = "lambda:InvokeFunction"
  function_name = "submit_quiz"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/POST/quiz/*/submit"
}

resource "aws_lambda_permission" "api_gateway_invoke_get_attempt" {
  statement_id  = "AllowAPIGatewayInvokeGetAttempt"
  action        = "lambda:InvokeFunction"
  function_name = "get_attempt"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/GET/attempt/*"
}

resource "aws_lambda_permission" "api_gateway_invoke_delete_quiz" {
  statement_id  = "AllowAPIGatewayInvokeDeleteQuiz"
  action        = "lambda:InvokeFunction"
  function_name = "delete_quiz"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/DELETE/quiz/*"
}

resource "aws_lambda_permission" "api_gateway_invoke_profile" {
  statement_id  = "AllowAPIGatewayInvokeProfile"
  action        = "lambda:InvokeFunction"
  function_name = "profile"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.quizcraft_api.execution_arn}/*/GET/profile"
}

output "invoke_url" {
  value = "${aws_api_gateway_stage.prod.invoke_url}/quiz"
}