import { SecretsManager } from "aws-sdk";

const secretsManagerClient = new SecretsManager({});

const getDbonectionString = async () => {
  const secretName = process.env.DB_CREDENTIALS_SECRET_NAME!;

  const secret = await secretsManagerClient
    .getSecretValue({
      SecretId: secretName,
    })
    .promise();

  const dbCreds = JSON.parse(secret.SecretString!) as {
    username: string;
    password: string;
  };

  return `postgres://${dbCreds.username}:${dbCreds.password}@${process.env.DB_CLUSTER_HOST_NAME}:${process.env.DB_CLUSTER_PORT}/${process.env.DB_NAME}`;
};

export { getDbonectionString };
