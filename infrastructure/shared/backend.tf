terraform {
  backend "s3" {
    # Backend configuration will be provided via backend config file
    # terraform init -backend-config=backend-config.hcl
  }
}