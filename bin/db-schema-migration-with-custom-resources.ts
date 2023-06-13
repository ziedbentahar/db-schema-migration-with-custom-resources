#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DbSchemaMigrationWithCustomResourcesStack } from "../lib/db-schema-migration-with-custom-resources-stack";

const app = new cdk.App({});

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new DbSchemaMigrationWithCustomResourcesStack(
  app,
  "DbSchemaMigrationWithCustomResourcesStack",
  {
    env,
  }
);
