import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import Database from "./database";
import { SampleVPC } from "./vpc";

export class DbSchemaMigrationWithCustomResourcesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { vpc } = new SampleVPC(this, "SampleVPCForDbMigrations");
    const database = new Database(this, "SampleDatabaseForDbMigrations", {
      applicationName: "sampleapp",
      migrationDirectoryPath: path.join(__dirname, "./migrations"),
      vpc,
    });
  }
}
