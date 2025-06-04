# Smart Livestock Feeder Infrastructure

This directory contains the AWS CDK (Cloud Development Kit) infrastructure code for the Smart Livestock Feeder project.

## Prerequisites

1. **AWS CLI configured** - Make sure you have AWS credentials configured

   ```bash
   aws configure
   ```

2. **Node.js and pnpm** - Already installed in your project

## Getting Started

### 1. Install Dependencies

```bash
cd infrastructure
pnpm install
```

### 2. Bootstrap CDK (First time only)

Before you can deploy CDK stacks, you need to bootstrap your AWS environment:

```bash
pnpm run bootstrap
```

This creates the necessary S3 buckets and IAM roles that CDK needs to deploy resources.

### 3. Synthesize CloudFormation Template

To see what resources will be created without deploying:

```bash
pnpm run synth
```

### 4. Deploy the Stack

To deploy your Lambda function to AWS:

```bash
pnpm run deploy
```

### 5. Test the Lambda Function

After deployment, you can test the Lambda function using the AWS CLI:

```bash
aws lambda invoke --function-name [FUNCTION_NAME] --payload '{"test": "data"}' response.json
cat response.json
```

## Available Scripts

- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run watch` - Watch for changes and recompile
- `pnpm run synth` - Synthesize CloudFormation template
- `pnpm run deploy` - Deploy the stack to AWS
- `pnpm run destroy` - Delete the stack from AWS
- `pnpm run diff` - Compare deployed stack with current state
- `pnpm run bootstrap` - Bootstrap CDK in your AWS account

## Project Structure

```
infrastructure/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   └── smart-livestock-feeder-stack.ts  # Main stack definition
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── cdk.json               # CDK configuration
└── README.md              # This file
```

## Current Resources

The stack currently creates:

1. **Lambda Function** (`HelloLambda`)

   - Runtime: Node.js 20.x
   - Handler: `index.handler`
   - Memory: 128 MB
   - Timeout: 30 seconds
   - Log retention: 1 week

2. **IAM Role** - Execution role for the Lambda function

3. **CloudWatch Log Group** - For Lambda function logs

## Next Steps

This is a basic setup. You can extend it by:

1. **Adding API Gateway** - To create HTTP endpoints for your Lambda
2. **Adding DynamoDB** - For data storage
3. **Adding S3 Buckets** - For file storage
4. **Adding IoT Core** - For device communication
5. **Adding more Lambda functions** - For different features

## Useful CDK Commands

- `cdk ls` - List all stacks
- `cdk diff` - Compare deployed stack with current state
- `cdk deploy` - Deploy this stack to your default AWS account/region
- `cdk destroy` - Delete the stack
- `cdk synth` - Emits the synthesized CloudFormation template

## Troubleshooting

### Permission Errors

If you get permission errors, make sure your AWS credentials have the necessary permissions to create Lambda functions, IAM roles, and CloudWatch log groups.

### Bootstrap Issues

If deployment fails with bootstrap errors, run:

```bash
pnpm run bootstrap
```

### Region Issues

Make sure your AWS CLI is configured for the correct region where you want to deploy resources.
