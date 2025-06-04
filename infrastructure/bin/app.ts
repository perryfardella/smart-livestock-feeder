#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SmartLivestockFeederStack } from "../lib/smart-livestock-feeder-stack";

const app = new cdk.App();

new SmartLivestockFeederStack(app, "SmartLivestockFeederStack", {
  env: {
    // You can specify account and region here if needed
    // account: process.env.CDK_DEFAULT_ACCOUNT,
    // region: process.env.CDK_DEFAULT_REGION,
  },
});
