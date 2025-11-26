import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("telecine");
const zoneId = config.require("telecineComZoneId");

// A record for api.editframe.com -> 142.93.66.71
export const api_editframe_com_a_0 = new cloudflare.DnsRecord(
  "api_editframe_com_a_0",
  {
    zoneId: zoneId,
    name: "api.editframe.com",
    type: "A",
    content: "142.93.66.71",
    ttl: 1,
    proxied: true,
  },
  {
    protect: true,
  },
);

// A record for editframe.com -> 34.49.98.0
export const editframe_com_a_1 = new cloudflare.DnsRecord(
  "editframe_com_a_1",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "A",
    content: "34.49.98.0",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// A record for insight.editframe.com -> 142.93.66.71
export const insight_editframe_com_a_2 = new cloudflare.DnsRecord(
  "insight_editframe_com_a_2",
  {
    zoneId: zoneId,
    name: "insight.editframe.com",
    type: "A",
    content: "142.93.66.71",
    ttl: 1,
    proxied: true,
  },
  {
    protect: true,
  },
);

// A record for www.editframe.com -> 34.49.98.0
export const www_editframe_com_a_3 = new cloudflare.DnsRecord(
  "www_editframe_com_a_3",
  {
    zoneId: zoneId,
    name: "www.editframe.com",
    type: "A",
    content: "34.49.98.0",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// A record for assets.editframe.com -> 34.49.98.0
export const assets_editframe_com_a_33 = new cloudflare.DnsRecord(
  "assets_editframe_com_a_33",
  {
    zoneId: zoneId,
    name: "assets.editframe.com",
    type: "A",
    content: "34.49.98.0",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CAA record for editframe.com -> 0 issue "pki.goog"
export const editframe_com_caa_4 = new cloudflare.DnsRecord(
  "editframe_com_caa_4",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "CAA",
    data: {
      flags: 0,
      tag: "issue",
      value: "pki.goog",
    },
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CAA record for editframe.com -> 0 issue "letsencrypt.org"
export const editframe_com_caa_5 = new cloudflare.DnsRecord(
  "editframe_com_caa_5",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "CAA",
    data: {
      flags: 0,
      tag: "issue",
      value: "letsencrypt.org",
    },
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CAA record for www.editframe.com -> 0 issue "letsencrypt.org"
export const www_editframe_com_caa_6 = new cloudflare.DnsRecord(
  "www_editframe_com_caa_6",
  {
    zoneId: zoneId,
    name: "www.editframe.com",
    type: "CAA",
    data: {
      flags: 0,
      tag: "issue",
      value: "letsencrypt.org",
    },
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CAA record for www.editframe.com -> 0 issue "pki.goog"
export const www_editframe_com_caa_7 = new cloudflare.DnsRecord(
  "www_editframe_com_caa_7",
  {
    zoneId: zoneId,
    name: "www.editframe.com",
    type: "CAA",
    data: {
      flags: 0,
      tag: "issue",
      value: "pki.goog",
    },
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CNAME record for app.editframe.com -> js-frontend.vercel.app
export const app_editframe_com_cname_8 = new cloudflare.DnsRecord(
  "app_editframe_com_cname_8",
  {
    zoneId: zoneId,
    name: "app.editframe.com",
    type: "CNAME",
    content: "js-frontend.vercel.app",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CNAME record for cdn.editframe.com -> efapi.nyc3.cdn.digitaloceanspaces.com
export const cdn_editframe_com_cname_9 = new cloudflare.DnsRecord(
  "cdn_editframe_com_cname_9",
  {
    zoneId: zoneId,
    name: "cdn.editframe.com",
    type: "CNAME",
    content: "efapi.nyc3.cdn.digitaloceanspaces.com",
    ttl: 1,
    proxied: true,
  },
  {
    protect: true,
  },
);

// CNAME record for editor.editframe.com -> cname.vercel-dns.com
export const editor_editframe_com_cname_10 = new cloudflare.DnsRecord(
  "editor_editframe_com_cname_10",
  {
    zoneId: zoneId,
    name: "editor.editframe.com",
    type: "CNAME",
    content: "cname.vercel-dns.com",
    ttl: 1,
    proxied: true,
  },
  {
    protect: true,
  },
);

// CNAME record for email.editframe.com -> mailgun.org
export const email_editframe_com_cname_11 = new cloudflare.DnsRecord(
  "email_editframe_com_cname_11",
  {
    zoneId: zoneId,
    name: "email.editframe.com",
    type: "CNAME",
    content: "mailgun.org",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CNAME record for embed.editframe.com -> cname.vercel-dns.com
export const embed_editframe_com_cname_12 = new cloudflare.DnsRecord(
  "embed_editframe_com_cname_12",
  {
    zoneId: zoneId,
    name: "embed.editframe.com",
    type: "CNAME",
    content: "cname.vercel-dns.com",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// CNAME record for player.editframe.com -> cname.vercel-dns.com
export const player_editframe_com_cname_13 = new cloudflare.DnsRecord(
  "player_editframe_com_cname_13",
  {
    zoneId: zoneId,
    name: "player.editframe.com",
    type: "CNAME",
    content: "cname.vercel-dns.com",
    ttl: 1,
    proxied: true,
  },
  {
    protect: true,
  },
);

// MX record for editframe.com -> alt3.aspmx.l.google.com
export const editframe_com_mx_14 = new cloudflare.DnsRecord(
  "editframe_com_mx_14",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "MX",
    content: "alt3.aspmx.l.google.com",
    ttl: 1,
    proxied: false,
    priority: 10,
  },
  {
    protect: true,
  },
);

// MX record for editframe.com -> aspmx.l.google.com
export const editframe_com_mx_15 = new cloudflare.DnsRecord(
  "editframe_com_mx_15",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "MX",
    content: "aspmx.l.google.com",
    ttl: 1,
    proxied: false,
    priority: 1,
  },
  {
    protect: true,
  },
);

// MX record for editframe.com -> alt4.aspmx.l.google.com
export const editframe_com_mx_16 = new cloudflare.DnsRecord(
  "editframe_com_mx_16",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "MX",
    content: "alt4.aspmx.l.google.com",
    ttl: 1,
    proxied: false,
    priority: 10,
  },
  {
    protect: true,
  },
);

// MX record for editframe.com -> alt2.aspmx.l.google.com
export const editframe_com_mx_17 = new cloudflare.DnsRecord(
  "editframe_com_mx_17",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "MX",
    content: "alt2.aspmx.l.google.com",
    ttl: 1,
    proxied: false,
    priority: 5,
  },
  {
    protect: true,
  },
);

// MX record for editframe.com -> alt1.aspmx.l.google.com
export const editframe_com_mx_18 = new cloudflare.DnsRecord(
  "editframe_com_mx_18",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "MX",
    content: "alt1.aspmx.l.google.com",
    ttl: 1,
    proxied: false,
    priority: 5,
  },
  {
    protect: true,
  },
);

// TXT record for _acme-challenge.api.editframe.com -> aa_WE4XP58x2OrL4DzKHyI_352qtiTXSBeASpjvh53M
export const _acme_challenge_api_editframe_com_txt_19 =
  new cloudflare.DnsRecord(
    "_acme_challenge_api_editframe_com_txt_19",
    {
      zoneId: zoneId,
      name: "_acme-challenge.api.editframe.com",
      type: "TXT",
      content: "aa_WE4XP58x2OrL4DzKHyI_352qtiTXSBeASpjvh53M",
      ttl: 1,
      proxied: false,
      comment: "Added to verify SSL certificate challenge.",
    },
    {
      protect: true,
    },
  );

// TXT record for _acme-challenge.editframe.com -> "_c4lXy5-EDx2H8AM-J2SWQFN4aJDbGWreZlA3B55eKg"
export const _acme_challenge_editframe_com_txt_20 = new cloudflare.DnsRecord(
  "_acme_challenge_editframe_com_txt_20",
  {
    zoneId: zoneId,
    name: "_acme-challenge.editframe.com",
    type: "TXT",
    content: `"_c4lXy5-EDx2H8AM-J2SWQFN4aJDbGWreZlA3B55eKg"`,
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for _acme-challenge.www.editframe.com -> "bF0a178XNxIaTP1qVpiRIQMb6LodA17c8fqb9vzwnXM"
export const _acme_challenge_www_editframe_com_txt_21 =
  new cloudflare.DnsRecord(
    "_acme_challenge_www_editframe_com_txt_21",
    {
      zoneId: zoneId,
      name: "_acme-challenge.www.editframe.com",
      type: "TXT",
      content: `"bF0a178XNxIaTP1qVpiRIQMb6LodA17c8fqb9vzwnXM"`,
      ttl: 1,
      proxied: false,
    },
    {
      protect: true,
    },
  );

// TXT record for cf2024-1._domainkey.editframe.com -> "v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78k" "m4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB"
export const cf2024_1__domainkey_editframe_com_txt_22 =
  new cloudflare.DnsRecord(
    "cf2024_1__domainkey_editframe_com_txt_22",
    {
      zoneId: zoneId,
      name: "cf2024-1._domainkey.editframe.com",
      type: "TXT",
      content: `"v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78k" "m4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB"`,
      ttl: 1,
      proxied: false,
    },
    {
      protect: true,
    },
  );

// TXT record for _dmarc.editframe.com -> v=DMARC1; p=reject; pct=20; rua=mailto:postmaster@editframe.com, mailto:dmarc@editframe.com
export const _dmarc_editframe_com_txt_23 = new cloudflare.DnsRecord(
  "_dmarc_editframe_com_txt_23",
  {
    zoneId: zoneId,
    name: "_dmarc.editframe.com",
    type: "TXT",
    content:
      "v=DMARC1; p=reject; pct=20; rua=mailto:postmaster@editframe.com, mailto:dmarc@editframe.com",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for editframe.com -> google-site-verification=FmdYv7ofyNo7IJUBxIn1bYcbDqlJntdp0HTCuMA5cBs
export const editframe_com_txt_24 = new cloudflare.DnsRecord(
  "editframe_com_txt_24",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "TXT",
    content:
      "google-site-verification=FmdYv7ofyNo7IJUBxIn1bYcbDqlJntdp0HTCuMA5cBs",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for editframe.com -> OSSRH-78861
export const editframe_com_txt_25 = new cloudflare.DnsRecord(
  "editframe_com_txt_25",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "TXT",
    content: "OSSRH-78861",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for editframe.com -> google-site-verification=qtK0YW4qRVncZ3V-Nrr8bvudVmkyw3qnfl1JTACHQYo
export const editframe_com_txt_26 = new cloudflare.DnsRecord(
  "editframe_com_txt_26",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "TXT",
    content:
      "google-site-verification=qtK0YW4qRVncZ3V-Nrr8bvudVmkyw3qnfl1JTACHQYo",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for editframe.com -> v=spf1 include:mailgun.org include:_spf.google.com ~all
export const editframe_com_txt_27 = new cloudflare.DnsRecord(
  "editframe_com_txt_27",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "TXT",
    content: "v=spf1 include:mailgun.org include:_spf.google.com ~all",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for editframe.com -> google-site-verification=hIA0graVSMQN6ZjyjER84e8IU1rEF_gGbwTOQeDfbHM
export const editframe_com_txt_28 = new cloudflare.DnsRecord(
  "editframe_com_txt_28",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "TXT",
    content:
      "google-site-verification=hIA0graVSMQN6ZjyjER84e8IU1rEF_gGbwTOQeDfbHM",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for editframe.com -> atlassian-domain-verification=Jl08lMJfRIXeNcwWs01xDkIsYTInS6tmECt0TLbrbbuiQS5QYosODxLNDdbW6r6q
export const editframe_com_txt_29 = new cloudflare.DnsRecord(
  "editframe_com_txt_29",
  {
    zoneId: zoneId,
    name: "editframe.com",
    type: "TXT",
    content:
      "atlassian-domain-verification=Jl08lMJfRIXeNcwWs01xDkIsYTInS6tmECt0TLbrbbuiQS5QYosODxLNDdbW6r6q",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for google._domainkey.editframe.com -> v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC64VCUyDnTDfjl6gHCiDcqySYOVmaTo9tLofcnpCATkCyp3pjcNpBkQz3+GSyu+MYGeHyXA5jvGTQAxCaOV3lb5sriSdljfA7vkKPcKHHdwyGNgOPN0c/AmZMkfIwbD3LgUxPzU+15xXx1hXykhVF4/3scXE7IT0+m8hFIwzAilwIDAQAB
export const google__domainkey_editframe_com_txt_30 = new cloudflare.DnsRecord(
  "google__domainkey_editframe_com_txt_30",
  {
    zoneId: zoneId,
    name: "google._domainkey.editframe.com",
    type: "TXT",
    content:
      "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC64VCUyDnTDfjl6gHCiDcqySYOVmaTo9tLofcnpCATkCyp3pjcNpBkQz3+GSyu+MYGeHyXA5jvGTQAxCaOV3lb5sriSdljfA7vkKPcKHHdwyGNgOPN0c/AmZMkfIwbD3LgUxPzU+15xXx1hXykhVF4/3scXE7IT0+m8hFIwzAilwIDAQAB",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// TXT record for mailo._domainkey.editframe.com -> k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC+o+hFpJgmint7luaY8QfeoMDHQ3GVhU3fGNlWvVj7s3XCN5Fn7wwwSVXziVlLF0aW0NdtPbJAf9gabLLa/J+C+64MCzxZh4dZqLLaIKlzQrH+C0wz5p0oNrEgOXYA0JRbTtctgMz/1X9ABqvWtlHfQ1RU2gU7oEPCsivmakmtKwIDAQAB
export const mailo__domainkey_editframe_com_txt_31 = new cloudflare.DnsRecord(
  "mailo__domainkey_editframe_com_txt_31",
  {
    zoneId: zoneId,
    name: "mailo._domainkey.editframe.com",
    type: "TXT",
    content:
      "k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC+o+hFpJgmint7luaY8QfeoMDHQ3GVhU3fGNlWvVj7s3XCN5Fn7wwwSVXziVlLF0aW0NdtPbJAf9gabLLa/J+C+64MCzxZh4dZqLLaIKlzQrH+C0wz5p0oNrEgOXYA0JRbTtctgMz/1X9ABqvWtlHfQ1RU2gU7oEPCsivmakmtKwIDAQAB",
    ttl: 1,
    proxied: false,
  },
  {
    protect: true,
  },
);

// AAAA record for metadata.editframe.com -> 100::
export const metadata_editframe_com_aaaa_32 = new cloudflare.DnsRecord(
  "metadata_editframe_com_aaaa_32",
  {
    zoneId: zoneId,
    name: "metadata.editframe.com",
    type: "AAAA",
    content: "100::",
    ttl: 1,
    proxied: true,
  },
  {
    protect: true,
  },
);
