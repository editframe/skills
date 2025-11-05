import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT } from "../constants";

const slackToken = gcp.secretmanager
    .getSecretVersionOutput({
        secret: "slack-auth-token",
        project: GCP_PROJECT,
        version: "latest",
    })
    .apply((secret) => secret.secretData);

const slackTeamId = gcp.secretmanager
    .getSecretVersionOutput({
        secret: "slack-team-id",
        project: GCP_PROJECT,
        version: "latest",
    })
    .apply((secret) => secret.secretData);

const slackChannelName = gcp.secretmanager
    .getSecretVersionOutput({
        secret: "slack-channel-name",
        project: GCP_PROJECT,
        version: "latest",
    })
    .apply((secret) => secret.secretData);
const slackNotificationChannel = new gcp.monitoring.NotificationChannel(
    "slackNotificationChannel-web",
    {
        displayName: "Slack Notification",
        type: "slack",
        labels: {
            auth_token: slackToken,
            channel_name: slackChannelName,
            team: slackTeamId,
        },
    },
);
export const cloudRunServiceErrorAlert = new gcp.monitoring.AlertPolicy(
    "telecine-web-error-alert",
    {
        displayName: "Telecine Web Service Error",
        conditions: [{
            displayName: "Telecine Web Service Error",
            conditionMatchedLog: {
                filter: `resource.type="cloud_run_revision" AND severity=ERROR AND resource.labels.service_name="telecine-web"`,
            },
        },
        ],
        notificationChannels: [slackNotificationChannel.name],
        combiner: "OR",
        enabled: true,
        alertStrategy: {
            autoClose: "1800s",
            notificationRateLimit: {
                period: "300s"
            },
        },
    }
);
