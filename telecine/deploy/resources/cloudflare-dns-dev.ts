import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("telecine");
const zoneId = config.require("telecineDevZoneId");

// A record for editframe.dev -> 34.49.98.0
export const editframe_dev_a_0 = new cloudflare.DnsRecord("editframe_dev_a_0", {
  zoneId: zoneId,
  name: "editframe.dev",
  type: "A",
  content: "34.49.98.0",
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// A record for www.editframe.dev -> 34.49.98.0
export const www_editframe_dev_a_1 = new cloudflare.DnsRecord("www_editframe_dev_a_1", {
  zoneId: zoneId,
  name: "www.editframe.dev",
  type: "A",
  content: "34.49.98.0",
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// CAA record for editframe.dev -> 0 issue "letsencrypt.org"
export const editframe_dev_caa_2 = new cloudflare.DnsRecord("editframe_dev_caa_2", {
  zoneId: zoneId,
  name: "editframe.dev",
  type: "CAA",
  data: {
    flags: 0,
    tag: "issue",
    value: "letsencrypt.org",
  },
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// CAA record for editframe.dev -> 0 issue "pki.goog"
export const editframe_dev_caa_3 = new cloudflare.DnsRecord("editframe_dev_caa_3", {
  zoneId: zoneId,
  name: "editframe.dev",
  type: "CAA",
  data: {
    flags: 0,
    tag: "issue",
    value: "pki.goog",
  },
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// CAA record for www.editframe.dev -> 0 issue "pki.goog"
export const www_editframe_dev_caa_4 = new cloudflare.DnsRecord("www_editframe_dev_caa_4", {
  zoneId: zoneId,
  name: "www.editframe.dev",
  type: "CAA",
  data: {
    flags: 0,
    tag: "issue",
    value: "pki.goog",
  },
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// CAA record for www.editframe.dev -> 0 issue "letsencrypt.org"
export const www_editframe_dev_caa_5 = new cloudflare.DnsRecord("www_editframe_dev_caa_5", {
  zoneId: zoneId,
  name: "www.editframe.dev",
  type: "CAA",
  data: {
    flags: 0,
    tag: "issue",
    value: "letsencrypt.org",
  },
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// CNAME record for collin-box-1.editframe.dev -> c33e912e-1d48-45b5-ae6c-4105fb8c7075.cfargotunnel.com
export const collin_box_1_editframe_dev_cname_6 = new cloudflare.DnsRecord("collin_box_1_editframe_dev_cname_6", {
  zoneId: zoneId,
  name: "collin-box-1.editframe.dev",
  type: "CNAME",
  content: "c33e912e-1d48-45b5-ae6c-4105fb8c7075.cfargotunnel.com",
  ttl: 1,
  proxied: true,
}, {
  protect: true,
});

// CNAME record for collin-box-2.editframe.dev -> 79c56102-8004-4596-b442-968735e7c2b5.cfargotunnel.com
export const collin_box_2_editframe_dev_cname_7 = new cloudflare.DnsRecord("collin_box_2_editframe_dev_cname_7", {
  zoneId: zoneId,
  name: "collin-box-2.editframe.dev",
  type: "CNAME",
  content: "79c56102-8004-4596-b442-968735e7c2b5.cfargotunnel.com",
  ttl: 1,
  proxied: true,
}, {
  protect: true,
});

// CNAME record for collin-box-3.editframe.dev -> 2931cf12-8540-4fe0-95eb-9d14dd00328f.cfargotunnel.com
export const collin_box_3_editframe_dev_cname_8 = new cloudflare.DnsRecord("collin_box_3_editframe_dev_cname_8", {
  zoneId: zoneId,
  name: "collin-box-3.editframe.dev",
  type: "CNAME",
  content: "2931cf12-8540-4fe0-95eb-9d14dd00328f.cfargotunnel.com",
  ttl: 1,
  proxied: true,
}, {
  protect: true,
});

// CNAME record for collin-box-4.editframe.dev -> 0660bf15-7b99-414c-b0f9-62ed75fd55f2.cfargotunnel.com
export const collin_box_4_editframe_dev_cname_9 = new cloudflare.DnsRecord("collin_box_4_editframe_dev_cname_9", {
  zoneId: zoneId,
  name: "collin-box-4.editframe.dev",
  type: "CNAME",
  content: "0660bf15-7b99-414c-b0f9-62ed75fd55f2.cfargotunnel.com",
  ttl: 1,
  proxied: true,
}, {
  protect: true,
});

// CNAME record for collin-swarm-manager.editrfame.dev.editframe.dev -> 7b867945-672f-48b0-a4e2-09840aee4aca.cfargotunnel.com
export const collin_swarm_manager_editrfame_dev_editframe_dev_cname_10 = new cloudflare.DnsRecord("collin_swarm_manager_editrfame_dev_editframe_dev_cname_10", {
  zoneId: zoneId,
  name: "collin-swarm-manager.editrfame.dev.editframe.dev",
  type: "CNAME",
  content: "7b867945-672f-48b0-a4e2-09840aee4aca.cfargotunnel.com",
  ttl: 1,
  proxied: true,
}, {
  protect: true,
});

// TXT record for _acme-challenge.editframe.dev -> "h05YPrDb0U9HGe1Ip-B2-qkpep6fseaocm5PMgJ8vCE"
export const _acme_challenge_editframe_dev_txt_11 = new cloudflare.DnsRecord("_acme_challenge_editframe_dev_txt_11", {
  zoneId: zoneId,
  name: "_acme-challenge.editframe.dev",
  type: "TXT",
  content: `"h05YPrDb0U9HGe1Ip-B2-qkpep6fseaocm5PMgJ8vCE"`,
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// TXT record for _acme-challenge.www.editframe.dev -> "JMJu79BpljbkmwAOBt_43eTqCp846jyL8a1s3zBxRGo"
export const _acme_challenge_www_editframe_dev_txt_12 = new cloudflare.DnsRecord("_acme_challenge_www_editframe_dev_txt_12", {
  zoneId: zoneId,
  name: "_acme-challenge.www.editframe.dev",
  type: "TXT",
  content: `"JMJu79BpljbkmwAOBt_43eTqCp846jyL8a1s3zBxRGo"`,
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// TXT record for _dmarc.editframe.dev -> v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;
export const _dmarc_editframe_dev_txt_13 = new cloudflare.DnsRecord("_dmarc_editframe_dev_txt_13", {
  zoneId: zoneId,
  name: "_dmarc.editframe.dev",
  type: "TXT",
  content: "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;",
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// TXT record for *._domainkey.editframe.dev -> v=DKIM1; p=
export const wildcard__domainkey_editframe_dev_txt_14 = new cloudflare.DnsRecord("wildcard__domainkey_editframe_dev_txt_14", {
  zoneId: zoneId,
  name: "*._domainkey.editframe.dev",
  type: "TXT",
  content: "v=DKIM1; p=",
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});

// TXT record for editframe.dev -> v=spf1 -all
export const editframe_dev_txt_15 = new cloudflare.DnsRecord("editframe_dev_txt_15", {
  zoneId: zoneId,
  name: "editframe.dev",
  type: "TXT",
  content: "v=spf1 -all",
  ttl: 1,
  proxied: false,
}, {
  protect: true,
});
