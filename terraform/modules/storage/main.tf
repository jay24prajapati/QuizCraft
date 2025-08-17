resource "aws_s3_bucket" "pdfs" {
  bucket = "quizcraft-pdfs-${random_string.suffix.result}"
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
  lower   = true
  numeric = true
}

output "pdf_bucket_arn" {
  value = aws_s3_bucket.pdfs.arn
}

output "pdf_bucket_name" {
  value = aws_s3_bucket.pdfs.bucket
}

