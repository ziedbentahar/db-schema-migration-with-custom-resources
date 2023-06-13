import {
  CdkCustomResourceEvent,
  CdkCustomResourceResponse,
  Context,
} from "aws-lambda";
import runner from "node-pg-migrate";
import { getDbonectionString } from "./db-connection-string-provider";

export const handler = async (
  event: CdkCustomResourceEvent,
  context: Context
): Promise<CdkCustomResourceResponse> => {
  const resp: CdkCustomResourceResponse = {
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: context.logGroupName,
  };

  if (event.RequestType == "Delete") {
    return {
      ...resp,
      Status: "SUCCESS",
      Data: { Result: "None" },
    };
  }

  try {
    const connectionString = await getDbonectionString();

    const migrationResult = await runner({
      databaseUrl: connectionString,
      migrationsTable: "migration-table",
      dir: `${__dirname}/migrations`,
      direction: "up",
      verbose: true,
    });

    const nbOfExecutedScripts = migrationResult.length;

    return {
      ...resp,
      Status: "SUCCESS",
      Data: { Result: nbOfExecutedScripts },
    };
  } catch (error) {
    if (error instanceof Error) {
      resp.Reason = error.message;
    }
    return {
      ...resp,
      Status: "FAILED",
      Data: { Result: error },
    };
  }
};
