import { CustomResource, Duration } from "aws-cdk-lib";
import {
  ISecurityGroup,
  IVpc,
  Port,
  SecurityGroup,
  SubnetType,
} from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Architecture, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  AuroraPostgresEngineVersion,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  IDatabaseCluster,
} from "aws-cdk-lib/aws-rds";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";
import { computeDirHash } from "./utils";

interface DatabaseProps {
  vpc: IVpc;
  applicationName: string;
  migrationDirectoryPath: string;
}

class Database extends Construct {
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);
    const { vpc, applicationName, migrationDirectoryPath } = props!;
    const dbSecurityGroup = new SecurityGroup(this, "DBClusterSecurityGroup", {
      vpc,
    });

    const dbName = applicationName;

    const dbSecret = new Secret(this, "DBCredentialsSecret", {
      secretName: `${applicationName}-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: applicationName,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
      },
    });

    const dbCluster = new DatabaseCluster(this, "Database", {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_14_7,
      }),
      defaultDatabaseName: dbName,
      writer: ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      readers: [
        ClusterInstance.serverlessV2("reader", { scaleWithWriter: true }),
      ],
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_ISOLATED,
      }),
      credentials: Credentials.fromPassword(
        dbSecret.secretValueFromJson("username").unsafeUnwrap(),
        dbSecret.secretValueFromJson("password")
      ),
      port: 5432,
      securityGroups: [dbSecurityGroup],
    });

    const { lambdaFunction, lambdaSecurityGroup } = this.createMigrationLambda(
      applicationName,
      migrationDirectoryPath!,
      vpc,
      dbSecret,
      dbCluster,
      dbName
    );

    dbSecurityGroup.addIngressRule(lambdaSecurityGroup, Port.tcp(5432));

    this.createCustomResource(
      dbCluster,
      lambdaFunction,
      migrationDirectoryPath!
    );
  }

  createMigrationLambda(
    applicationName: string,
    migrationDirectoryPath: string,
    vpc: IVpc,
    secret: ISecret,
    database: IDatabaseCluster,
    dbName: string
  ): { lambdaFunction: IFunction; lambdaSecurityGroup: ISecurityGroup } {
    const executionRole = new Role(this, "LambdaExecutionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });

    const cloudWatchPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources: ["arn:aws:logs:*:*:*"],
    });

    const secretAccessPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["secretsmanager:GetSecretValue"],
      resources: [secret.secretArn],
    });

    executionRole.addToPolicy(cloudWatchPolicy);
    executionRole.addToPolicy(secretAccessPolicy);
    executionRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaVPCAccessExecutionRole"
      )
    );

    const lambdaSecurityGroup = new SecurityGroup(this, "LambdaSecurityGroup", {
      vpc,
      allowAllOutbound: true,
    });

    const lambdaFunction = new NodejsFunction(
      this,
      `${applicationName}-lambda-1`,
      {
        memorySize: 128,
        timeout: Duration.seconds(60),
        runtime: Runtime.NODEJS_18_X,
        architecture: Architecture.ARM_64,
        bundling: {
          commandHooks: {
            beforeBundling: Noop,
            beforeInstall: Noop,
            afterBundling: (_, outputDir: string) => {
              return [
                `mkdir -p ${outputDir}/migrations && cp ${migrationDirectoryPath}/* ${outputDir}/migrations`,
              ];
            },
          },
        },
        entry: path.join(
          __dirname,
          "./db-migration-lambda-function/handler.ts"
        ),
        functionName: `${applicationName}-db-migration`,
        handler: "handler",
        role: executionRole,
        vpc: vpc,
        vpcSubnets: vpc.selectSubnets({
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        }),
        securityGroups: [lambdaSecurityGroup],
        environment: {
          DB_CREDENTIALS_SECRET_NAME: secret.secretName,
          DB_CLUSTER_HOST_NAME: database.clusterEndpoint.hostname,
          DB_CLUSTER_PORT: database.clusterEndpoint.port.toString(),
          DB_NAME: dbName,
        },
      }
    );

    return { lambdaFunction, lambdaSecurityGroup };
  }

  createCustomResource(
    database: IDatabaseCluster,
    lambdaFunction: IFunction,
    migrationDirectoryPath: string
  ) {
    const dbMigrationProvider = new Provider(this, "MyProvider", {
      onEventHandler: lambdaFunction,
    });

    const customResource = new CustomResource(
      this,
      "Custom::DbSchemaMigration",
      {
        serviceToken: dbMigrationProvider.serviceToken,
        resourceType: "Custom::DbSchemaMigration",
        properties: {
          migrationDirectoryHash: computeDirHash(migrationDirectoryPath),
        },
      }
    );

    customResource.node.addDependency(database);
  }
}

export default Database;

const Noop = () => {
  return [];
};
