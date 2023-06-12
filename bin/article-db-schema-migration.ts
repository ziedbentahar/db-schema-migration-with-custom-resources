#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ArticleDbSchemaMigrationStack } from '../lib/article-db-schema-migration-stack';

const app = new cdk.App();
new ArticleDbSchemaMigrationStack(app, 'ArticleDbSchemaMigrationStack');
