resource "aws_dynamodb_table" "quizzes" {
  name           = "Quizzes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "quiz_id"
  attribute {
    name = "quiz_id"
    type = "S"
  }
  attribute {
    name = "user_id"
    type = "S"
  }
  global_secondary_index {
    name               = "UserIdIndex"
    hash_key           = "user_id"
    projection_type    = "ALL"
  }
}

resource "aws_dynamodb_table" "attempts" {
  name           = "Attempts"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "attempt_id"
  attribute {
    name = "attempt_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "topics" {
  name           = "Topics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "topic_id"
  attribute {
    name = "user_id"
    type = "S"
  }
  attribute {
    name = "topic_id"
    type = "S"
  }
  attribute {
    name = "source_identifier"
    type = "S"
  }
  global_secondary_index {
    name               = "UniqueSourceIndex"
    hash_key           = "user_id"
    range_key          = "source_identifier"
    projection_type    = "ALL"
  }
}

output "quizzes_table_arn" {
  value = aws_dynamodb_table.quizzes.arn
}

output "quizzes_table_name" {
  value = aws_dynamodb_table.quizzes.name
}

output "attempts_table_arn" {
  value = aws_dynamodb_table.attempts.arn
}

output "attempts_table_name" {
  value = aws_dynamodb_table.attempts.name
}

output "topics_table_arn" {
  value = aws_dynamodb_table.topics.arn
}

output "topics_table_name" {
  value = aws_dynamodb_table.topics.name
}