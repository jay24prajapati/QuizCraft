variable "attempts_table_arn" {
  type        = string
  description = "ARN of the DynamoDB Attempts table"
}

# IAM Role for QuickSight to access DynamoDB
resource "aws_iam_role" "quicksight_dynamodb_access" {
  name = "QuickSightDynamoDBAccessRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "quicksight.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# IAM Policy for QuickSight to read from DynamoDB
resource "aws_iam_role_policy" "quicksight_dynamodb_policy" {
  name   = "QuickSightDynamoDBPolicy"
  role   = aws_iam_role.quicksight_dynamodb_access.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = var.attempts_table_arn
      }
    ]
  })
}

# Output the IAM role ARN for QuickSight configuration
output "quicksight_role_arn" {
  value       = aws_iam_role.quicksight_dynamodb_access.arn
  description = "ARN of the IAM role for QuickSight to access DynamoDB"
}
