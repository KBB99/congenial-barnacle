# Terraform Backend Configuration for Dev Environment
# Usage: terraform init -backend-config=backend-config.hcl

bucket         = "generative-world-terraform-state-dev"
key            = "dev/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "generative-world-terraform-locks-dev"

# Optional: Configure versioning and lifecycle
# versioning = true