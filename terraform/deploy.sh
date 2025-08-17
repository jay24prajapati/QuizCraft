#!/bin/bash

# Ensure we're in the correct directory (adjust if needed)
cd /Users/js/Desktop/Project_Cloud/quizcraft/terraform

# Get API endpoint from Terraform output
API_ENDPOINT=$(terraform output -raw api_endpoint 2>/dev/null)
if [ -z "$API_ENDPOINT" ]; then
  echo "API endpoint not found. Running initial terraform apply..."
  terraform apply -auto-approve
  API_ENDPOINT=$(terraform output -raw api_endpoint)
fi
echo "Using API_ENDPOINT: $API_ENDPOINT"

# Navigate to frontend directory
cd ../frontend/quizcraft-frontend

# Build frontend with API endpoint
REACT_APP_API_ENDPOINT=$API_ENDPOINT npm run build

# Upload to source bucket
aws s3 sync build/ s3://quizcraft-frontend-source/ --delete

# Navigate back to terraform directory
cd ../../terraform

# Apply Terraform with updated version (using timestamp)
VERSION=$(date +%s)
terraform apply -var="deploy_frontend=true" -var="deploy_frontend_version=$VERSION" -auto-approve

echo "Deployment completed!"