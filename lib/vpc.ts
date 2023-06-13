import { IVpc, IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class SampleVPC extends Construct {
  public readonly vpc: IVpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new Vpc(this, "SampleVPC", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/24"),
      subnetConfiguration: [
        { name: "public-subnet", subnetType: SubnetType.PUBLIC },
        {
          name: "privat-subnet",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: "isolated-subnet",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }
}
