provider "aws" {
  region = "us-east-1"
}

variable "deploy_frontend" {
  type        = bool
  default     = false
  description = "Set to true to deploy frontend files to the hosting bucket"
}

variable "deploy_frontend_version" {
  type        = string
  default     = "1"
  description = "Version or timestamp for frontend deployment to trigger sync"
}

module "frontend" {
  source = "./modules/frontend"
}

module "auth" {
  source                = "./modules/auth"
  cloudfront_domain_name = module.frontend.cloudfront_domain_name
  sns_topic_arn         = module.notifications.sns_topic_arn
}

module "api" {
  source                        = "./modules/api"
  cognito_user_pool_arn         = module.auth.cognito_user_pool_arn
  lambda_generate_quiz_invoke_arn = module.lambda.generate_quiz_invoke_arn
  lambda_get_quizzes_invoke_arn   = module.get_quizzes.get_quizzes_invoke_arn
  lambda_submit_quiz_invoke_arn   = module.submit_quiz.submit_quiz_invoke_arn
  lambda_get_attempt_invoke_arn   = module.get_attempt.get_attempt_invoke_arn
  lambda_delete_quiz_invoke_arn   = module.delete_quiz.delete_quiz_invoke_arn
  lambda_profile_invoke_arn       = module.profile.profile_invoke_arn
  depends_on                    = [module.get_quizzes]
}

module "lambda" {
  source               = "./modules/lambda"
  s3_bucket_arn        = module.storage.pdf_bucket_arn
  s3_bucket_name       = module.storage.pdf_bucket_name
  sqs_queue_arn        = module.queue.sqs_queue_arn
  sqs_queue_url        = module.queue.sqs_queue_url
  quizzes_table_arn    = module.database.quizzes_table_arn
  quizzes_table_name   = module.database.quizzes_table_name
  topics_table_arn     = module.database.topics_table_arn
  topics_table_name    = module.database.topics_table_name
}

module "quiz_generator" {
  source             = "./modules/quiz_generator"
  sqs_queue_arn      = module.queue.sqs_queue_arn
  sqs_queue_url      = module.queue.sqs_queue_url
  quizzes_table_arn  = module.database.quizzes_table_arn
  quizzes_table_name = module.database.quizzes_table_name
  s3_bucket_arn      = module.storage.pdf_bucket_arn
  s3_bucket_name     = module.storage.pdf_bucket_name
  sns_topic_arn      = module.notifications.sns_topic_arn
}

module "get_quizzes" {
  source             = "./modules/get_quizzes"
  quizzes_table_arn  = module.database.quizzes_table_arn
  quizzes_table_name = module.database.quizzes_table_name
}

module "queue" {
  source = "./modules/queue"
}

module "database" {
  source = "./modules/database"
}

module "notifications" {
  source = "./modules/notifications"
}

module "storage" {
  source = "./modules/storage"
}

module "submit_quiz" {
  source              = "./modules/submit_quiz"
  quizzes_table_arn   = module.database.quizzes_table_arn
  quizzes_table_name  = module.database.quizzes_table_name
  attempts_table_arn  = module.database.attempts_table_arn
  attempts_table_name = module.database.attempts_table_name
}

module "get_attempt" {
  source              = "./modules/get_attempt"
  attempts_table_arn  = module.database.attempts_table_arn
  attempts_table_name = module.database.attempts_table_name
  quizzes_table_arn   = module.database.quizzes_table_arn
  quizzes_table_name  = module.database.quizzes_table_name
}

module "delete_quiz" {
  source             = "./modules/delete_quiz"
  quizzes_table_arn  = module.database.quizzes_table_arn
  quizzes_table_name = module.database.quizzes_table_name
}

module "profile" {
  source              = "./modules/profile"
  quizzes_table_arn   = module.database.quizzes_table_arn
  quizzes_table_name  = module.database.quizzes_table_name
  attempts_table_arn  = module.database.attempts_table_arn
  attempts_table_name = module.database.attempts_table_name
}

# Add this block before the null_resource blocks
module "quicksight" {
  source            = "./modules/quicksight"
  attempts_table_arn = module.database.attempts_table_arn
}

resource "null_resource" "sync_frontend" {
  count = var.deploy_frontend ? 1 : 0

  triggers = {
    version = var.deploy_frontend_version
  }

  provisioner "local-exec" {
    command = "aws s3 sync s3://quizcraft-frontend-source/ s3://${module.frontend.bucket_name}/ --delete"
  }

  depends_on = [module.frontend]
}

resource "null_resource" "invalidate_cache" {
  count = var.deploy_frontend ? 1 : 0

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${module.frontend.cloudfront_distribution_id} --paths '/*'"
  }

  depends_on = [null_resource.sync_frontend]
}

output "api_endpoint" {
  value = module.api.invoke_url
}





