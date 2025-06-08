variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "static_assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  type        = string
}

variable "static_assets_bucket_domain_name" {
  description = "Domain name of the static assets S3 bucket"
  type        = string
}

variable "cloudfront_oac_id" {
  description = "CloudFront Origin Access Control ID"
  type        = string
}

variable "api_gateway_domain_name" {
  description = "Domain name of the API Gateway"
  type        = string
}

variable "domain_aliases" {
  description = "List of domain aliases for CloudFront"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "waf_web_acl_id" {
  description = "WAF Web ACL ID for CloudFront"
  type        = string
  default     = null
}

variable "cloudfront_logs_bucket_domain_name" {
  description = "Domain name of the CloudFront logs bucket"
  type        = string
  default     = ""
}