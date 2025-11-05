import * as gcp from "@pulumi/gcp";
import { GCP_REGION, GCP_PROJECT } from "./constants";

export const defaultNetwork = new gcp.compute.Network("default", {
  autoCreateSubnetworks: true,
  deleteDefaultRoutesOnCreate: false,
  description: "Default network for the project",
  name: "default",
  networkFirewallPolicyEnforcementOrder: "AFTER_CLASSIC_FIREWALL",
  project: GCP_PROJECT,
  routingMode: "REGIONAL",
}, {
  protect: true,
});

export const defaultSubnet = new gcp.compute.Subnetwork("default", {
  ipCidrRange: "10.128.0.0/20",
  name: "default",
  network: defaultNetwork.id,
  privateIpv6GoogleAccess: "DISABLE_GOOGLE_ACCESS",
  privateIpGoogleAccess: true,
  project: GCP_PROJECT,
  purpose: "PRIVATE",
  region: GCP_REGION,
  stackType: "IPV4_ONLY",
}, {
  protect: true,
});


const serverlessVpcConnectorIpCidrRange = "10.8.0.0/28";

// Create a Serverless VPC Connector
export const valkeyVpcConnector = new gcp.vpcaccess.Connector(
  "valkey-vpc-connector",
  {
    name: "valkey-vpc-connector",
    region: GCP_REGION,
    ipCidrRange: serverlessVpcConnectorIpCidrRange,
    network: defaultNetwork.id,
    project: GCP_PROJECT,
    maxThroughput: 300,
    minThroughput: 200,
  },
);

// New Firewall Rule to Allow Redis Traffic
export const allowRedisTraffic = new gcp.compute.Firewall(
  "allow-redis-traffic",
  {
    name: "allow-redis-traffic",
    network: defaultNetwork.id,
    allows: [
      {
        protocol: "tcp",
        ports: ["6379"],
      },
    ],
    sourceRanges: [serverlessVpcConnectorIpCidrRange], // CIDR range of the VPC connector
    targetTags: ["valkey-instance"], // Ensure your Compute Engine instance has this tag
    direction: "INGRESS",
    priority: 1000,
    project: GCP_PROJECT,
  },
  {
    dependsOn: [valkeyVpcConnector],
  },
);

// Add DNS configuration for routing Cloud Run domains to private Google API IPs
export const privateDnsZone = new gcp.dns.ManagedZone("private-googleapis-zone", {
  name: "private-googleapis-zone",
  dnsName: "googleapis.com.",
  visibility: "private",
  privateVisibilityConfig: {
    networks: [{
      networkUrl: defaultNetwork.selfLink,
    }],
  },
  project: GCP_PROJECT,
});

// Create DNS record sets for private.googleapis.com
export const privateApiRecordSet = new gcp.dns.RecordSet("private-googleapis-recordset", {
  name: "private.googleapis.com.",
  managedZone: privateDnsZone.name,
  type: "A",
  ttl: 300,
  rrdatas: ["199.36.153.8", "199.36.153.9", "199.36.153.10", "199.36.153.11"],
  project: GCP_PROJECT,
});

// DNS Zone for run.app domains
export const runAppDnsZone = new gcp.dns.ManagedZone("run-app-zone", {
  name: "run-app-zone",
  dnsName: "run.app.",
  visibility: "private",
  privateVisibilityConfig: {
    networks: [{
      networkUrl: defaultNetwork.selfLink,
    }],
  },
  project: GCP_PROJECT,
});

// Wildcard record for *.run.app pointing to private.googleapis.com
export const runAppRecordSet = new gcp.dns.RecordSet("run-app-recordset", {
  name: "*.run.app.",
  managedZone: runAppDnsZone.name,
  type: "CNAME",
  ttl: 300,
  rrdatas: ["private.googleapis.com."],
  project: GCP_PROJECT,
});

// Additional DNS zone for sqladmin.googleapis.com
export const sqlAdminDnsZone = new gcp.dns.ManagedZone("sqladmin-googleapis-zone", {
  name: "sqladmin-googleapis-zone",
  dnsName: "sqladmin.googleapis.com.",
  visibility: "private",
  privateVisibilityConfig: {
    networks: [{
      networkUrl: defaultNetwork.selfLink,
    }],
  },
  project: GCP_PROJECT,
});

export const sqlAdminRecordSet = new gcp.dns.RecordSet("sqladmin-googleapis-recordset", {
  name: "sqladmin.googleapis.com.",
  managedZone: sqlAdminDnsZone.name,
  type: "A",
  ttl: 300,
  rrdatas: ["199.36.153.8", "199.36.153.9", "199.36.153.10", "199.36.153.11"], // Same as private.googleapis.com
  project: GCP_PROJECT,
});

// Create a wildcard record for *.googleapis.com pointing to private.googleapis.com
export const wildcardGoogleapisRecordSet = new gcp.dns.RecordSet("wildcard-googleapis-recordset", {
  name: "*.googleapis.com.",
  managedZone: privateDnsZone.name,
  type: "CNAME",
  ttl: 300,
  rrdatas: ["private.googleapis.com."],
  project: GCP_PROJECT,
});