---
name: iac-best-practices
description: Apply Infrastructure as Code practices for reusable modules, remote state, least privilege, environment separation, validation, and safe changes. Use for Terraform, Pulumi, CDK, Ansible, or infrastructure reviews.
---

# Skill: iac-best-practices

Infrastructure as Code patterns using Terraform. Principles apply to Pulumi, CDK, and Ansible.

---

## Core Rules

- **Everything in code.** No manual console changes — ever. If it can't be in Terraform, document why.
- **Remote state with locking.** Never local state files in a team environment.
- **Variables, never hardcoding.** No resource names, ARNs, or config values hardcoded in `.tf` files.
- **Modules for reuse.** Don't copy-paste infrastructure blocks — extract modules.
- **Tag everything.** Every resource tagged with `project`, `environment`, `owner`, `managed-by = terraform`.
- **Least privilege.** IAM roles grant only what's needed — no `*` actions without documented justification.

---

## Repository Structure

```
infra/
├── environments/
│   ├── dev/
│   │   ├── main.tf           ← calls modules with dev variables
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── production/
├── modules/
│   ├── ecs-service/          ← reusable ECS service module
│   ├── rds-postgres/         ← reusable RDS module
│   ├── s3-bucket/
│   └── vpc/
├── shared/
│   ├── backend.tf            ← S3 + DynamoDB state backend
│   └── providers.tf
└── scripts/
    ├── plan.sh
    └── apply.sh
```

---

## State Management

```hcl
# shared/backend.tf
terraform {
  backend "s3" {
    bucket         = "{{ORG}}-terraform-state"
    key            = "{{PROJECT}}/{{ENVIRONMENT}}/terraform.tfstate"
    region         = "{{AWS_REGION}}"
    dynamodb_table = "{{ORG}}-terraform-locks"
    encrypt        = true
  }
}
```

- One state file per environment — not one global state
- State bucket: versioning enabled, MFA delete, access logging
- DynamoDB lock table prevents concurrent applies

---

## Module Pattern

```hcl
# modules/ecs-service/main.tf
variable "service_name"    { type = string }
variable "image_uri"       { type = string }
variable "cpu"             { type = number; default = 256 }
variable "memory"          { type = number; default = 512 }
variable "desired_count"   { type = number; default = 1 }
variable "environment_vars" {
  type    = map(string)
  default = {}
}
variable "secrets" {
  type    = map(string)  # name → SSM parameter ARN
  default = {}
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  cpu                      = var.cpu
  memory                   = var.memory
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name  = var.service_name
    image = var.image_uri
    # ... ports, health check, logging, env, secrets
  }])
}

# Caller
module "api" {
  source       = "../../modules/ecs-service"
  service_name = "api-${var.environment}"
  image_uri    = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
  cpu          = var.environment == "production" ? 512 : 256
  desired_count = var.environment == "production" ? 2 : 1
}
```

---

## Variable Management

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Deployment environment: dev, staging, production"
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"
}
```

Sensitive values (DB passwords, API keys) via:
1. AWS Secrets Manager or SSM Parameter Store (preferred)
2. Terraform variable with `sensitive = true` (never in `.tfvars` committed to git)
3. CI secrets injected as env vars: `TF_VAR_db_password`

---

## Tagging Strategy

```hcl
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.team_name
    CostCenter  = var.cost_center
  }
}

resource "aws_instance" "example" {
  # ...
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-web"
  })
}
```

---

## CI/CD for Infrastructure

```yaml
# .github/workflows/infra.yml
on:
  pull_request:
    paths: ['infra/**']
  push:
    branches: [main]
    paths: ['infra/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with: { terraform_version: "1.7.0" }
      - run: terraform init
        working-directory: infra/environments/${{ env.ENVIRONMENT }}
      - run: terraform validate
      - run: terraform plan -out=tfplan
      - uses: actions/upload-artifact@v4
        with: { name: tfplan, path: tfplan }

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    environment: ${{ env.ENVIRONMENT }}  # requires approval for production
    steps:
      - run: terraform apply tfplan
```

Rules:
- `plan` on every PR — output posted as a comment
- `apply` requires manual approval for staging and production
- Destroy operations require two approvals — always
- Never run `terraform apply -auto-approve` in CI for production

---

## Security Checklist for IaC

- [ ] No wildcard `*` in IAM policy `Action` or `Resource` without justification
- [ ] S3 buckets: public access blocked, encryption enabled, access logging enabled
- [ ] RDS: encryption at rest, no public access, deletion protection enabled
- [ ] Security groups: no inbound `0.0.0.0/0` except on load balancer port 443
- [ ] All secrets in Secrets Manager / SSM, not in Terraform state
- [ ] VPC flow logs enabled in production
- [ ] CloudTrail enabled in production
