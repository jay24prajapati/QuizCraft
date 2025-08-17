resource "aws_sqs_queue" "quiz_generation_queue" {
  name = "quiz-generation-queue"
  visibility_timeout_seconds = 120  # Set to 120 seconds
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.quiz_generation_queue.arn
}

output "sqs_queue_url" {
  value = aws_sqs_queue.quiz_generation_queue.url
}