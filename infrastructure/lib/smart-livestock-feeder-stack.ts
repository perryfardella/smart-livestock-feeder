import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class SmartLivestockFeederStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a simple Lambda function
    // To test this function, run: aws lambda invoke --function-name HelloWorldLambda response.json && cat response.json
    const helloLambda = new lambda.Function(this, "HelloLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      functionName: "HelloWorldLambda",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event, null, 2));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Hello from Smart Livestock Feeder Lambda!',
              timestamp: new Date().toISOString(),
              event: event
            }),
          };
        };
      `),
      description:
        "A simple Hello World Lambda function for Smart Livestock Feeder",
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, "LambdaFunctionArn", {
      value: helloLambda.functionArn,
      description: "ARN of the Hello Lambda function",
    });

    // Output the Lambda function name
    new cdk.CfnOutput(this, "LambdaFunctionName", {
      value: helloLambda.functionName,
      description: "Name of the Hello Lambda function",
    });
  }
}
