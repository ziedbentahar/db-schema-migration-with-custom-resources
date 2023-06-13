#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DbSchemaMigrationWithCustomResourcesStack } from '../lib/db-schema-migration-with-custom-resources-stack';

const app = new cdk.App();
new DbSchemaMigrationWithCustomResourcesStack(app, 'DbSchemaMigrationWithCustomResourcesStack');
