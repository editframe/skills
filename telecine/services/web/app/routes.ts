import {
  type RouteConfig,
  index,
  prefix,
  route,
  layout,
  relative,
} from "@react-router/dev/routes";

const v1 = relative("services/web/app/api/v1");
const hdb = relative("services/web/app/hdb");

const routes = [
  route("/sitemap.xml", "routes/sitemap.tsx"),
  route("/robots.txt", "routes/robots.txt.ts"),
  route("/llms.txt", "routes/llms.txt.ts"),
  route("/terms", "routes/terms.tsx"),
  route("/privacy", "routes/privacy.tsx"),
  route("/pricing", "routes/pricing.tsx"),
  route("/docs", "routes/docs-redirect.ts"),
  route("/docs/*", "routes/docs-redirect.ts", { id: "routes/docs-redirect-wildcard" }),
  route("/guides/*", "routes/guides-redirect.ts"),
  route("/blog/*", "routes/blog-redirect.ts"),
  route("/react", "routes/react-redirect.ts"),
  route("/tools/*", "routes/tools-redirect.ts"),
  route("/promote-podcasts-on-social-media", "routes/promote-podcasts-redirect.ts"),
  route("/:uploadType/:id/chunks", "routes/receiveUploadChunk.ts"),
  // route("/jit-preview", "routes/jit-preview.tsx"),
  route("/ef-sign-url", "routes/ef-sign-url.ts"),

  index("routes/index.tsx"),

  layout("routes/WithConfiguration.tsx", [
    route("/skills", "routes/skills/catalog.tsx"),
    route("/skills/:skill.md", "routes/skills/skill-detail.md.ts"),
    route("/skills/:skill/:reference.md", "routes/skills/reference-detail.md.ts"),
    route("/skills/:skill", "routes/skills/skill-detail.tsx"),
    route("/skills/:skill/:reference", "routes/skills/reference-detail.tsx"),
    route("/demos/motion-designer", "routes/demos/motion-designer.tsx"),
    route("/with/animejs", "routes/with/animejs.tsx"),
    route("/with/svg", "routes/with/svg.tsx"),

    layout("routes/resource/Layout.tsx", [
      route("/welcome", "routes/welcome.tsx"),
      route("/org/new", "routes/org/new.tsx"),
      route("/org/settings", "routes/org/settings.tsx"),
      route("/org/default", "routes/org/default.tsx"),

      ...prefix("/organizations", [
        ...prefix(":orgId", [
          ...prefix("members/:id", [
            route("revoke", "routes/org/members/revoke.ts"),
            route("update-role", "routes/org/members/update-role.ts"),
          ]),
          ...prefix("invites", [
            // route("new", "routes/org/invite-member.tsx"),
            ...prefix(":id", [
              route("cancel", "routes/org/invites/cancel.ts"),
              route("resend", "routes/org/invites/resend.ts"),
            ]),
          ]),
        ]),
      ]),
      ...prefix("/settings", [
        index("routes/settings/index.tsx"),
        route("/update-password", "routes/settings/update-password.tsx"),
      ]),
      ...prefix("/resource", [
        // ApiKeys have special routes for non-typical forms.
        ...prefix("/api_keys", [
          route("new", "routes/resource/api_keys/new.tsx"),
          ...prefix(":id", [
            route("", "routes/resource/api_keys/detail.tsx"),
            route("delete", "routes/resource/api_keys/delete.tsx"),
            route("extend", "routes/resource/api_keys/extend.tsx"),
            route("regenerate", "routes/resource/api_keys/regenerate.tsx"),
            route(
              "webhook_regenerate",
              "routes/resource/api_keys/webhook_regenerate.tsx",
            ),
          ]),
        ]),

        // Images have special routes for non-typical forms.
        ...prefix("/images", [
          route("upload", "routes/resource/images/upload.tsx"),
        ]),

        // IsobmffFiles have special routes for non - typical forms.
        ...prefix("/isobmff_files", [
          route("upload", "routes/resource/isobmff_files/upload.tsx"),
          route("ingest", "routes/resource/isobmff_files/ingest.tsx"),
        ]),

        // Renders have special routes for non-typical forms.
        ...prefix("/renders", [route("new", "routes/resource/renders/new.tsx")]),

        // Upload route under a non-conflicting prefix (can't be under /files
        // because "files" is a resourceType and would collide with /:resourceType/:id)
        route("/upload-file", "routes/resource/files/upload.tsx"),

        route("/:resourceType", "routes/resource/Listing.tsx", [
          route(":id", "routes/resource/Detail.tsx", [
            route(":relatedType/:relId", "routes/resource/Related.tsx"),
          ]),
        ]),
      ]),
    ]),
  ]),

  route("/admin", "routes/admin/index.tsx", [
    route("logtool", "routes/admin/logtool.tsx"),
    route("scheduler", "routes/admin/scheduler.tsx"),
    route("api-traffic", "routes/admin/api-traffic.tsx"),
    route("create-user", "routes/admin/create-user.tsx"),
    route("search-orgs", "routes/admin/search-orgs.ts"),
    route("queues/:name", "routes/admin/queue.tsx", [
      route("failed", "routes/admin/failedJobs.tsx"),
      route("claimed", "routes/admin/claimedJobs.tsx"),
      route("completed", "routes/admin/completedJobs.tsx"),
      route("stalled", "routes/admin/stalledJobs.tsx"),
      route(":stage", "routes/admin/queueJobs.tsx"),
      route("jobs/:id/retry", "routes/admin/retryJob.ts"),
      route("jobs/:id/release", "routes/admin/releaseJob.ts"),
      route("jobs/release-all", "routes/admin/releaseAllJobs.ts"),
      route(
        "jobs/release-all-stalled",
        "routes/admin/releaseAllStalledJobs.ts",
      ),
      route("jobs/delete-all-stalled", "routes/admin/deleteAllStalledJobs.ts"),
      route("jobs/delete-all-failed", "routes/admin/deleteAllFailedJobs.ts"),
      route(
        "jobs/delete-all-completed",
        "routes/admin/deleteAllCompletedJobs.ts",
      ),
      route("jobs/retry-all", "routes/admin/retryAllJobs.ts"),
      route(":stage/jobs/:id/delete", "routes/admin/deleteJob.ts"),
    ]),
    route(":resourceType", "routes/admin/listing.tsx", [
      route(":id", "routes/admin/detail.tsx"),
    ]),

    route("reprocess-html", "routes/admin/operations/reprocessHtml.tsx"),
  ]),

  route(
    "/email_passwords/:id/resend-verification",
    "routes/auth/resend-verification.tsx",
  ),

  route("/invitation/:token", "routes/org/invites/acceptInvitation.tsx"),

  ...prefix("/auth", [
    route("/status", "routes/auth/status.ts"),
    // Direct registration is disabled for now
    // route("/register", "routes/auth/register.tsx"),
    route("/register", "routes/auth/typeform-registration.tsx"),
    route("/confirm_email/:token", "routes/auth/confirm_email.tsx"),
    route("/login", "routes/auth/login.tsx"),
    route("/logout", "routes/auth/logout.tsx"),

    route("/magic-link", "routes/auth/magic-link.tsx"),
    route("/magic-link/:token", "routes/auth/claim-magic-link.tsx"),

    route("/reset-password", "routes/auth/reset-password.tsx"),
    route("/update-password/:token", "routes/auth/update-password.tsx"),

    ...prefix("/onboarding", [
      route("", "routes/auth/onboarding/index.tsx"),
      route("/next", "routes/auth/onboarding/next.tsx"),
    ]),
  ]),

  layout("api/v1/layout.ts", [
    ...v1.prefix("/api/v1", [
    v1.route("/organization", "organization.ts"),
    v1.route("/telemetry", "telemetry.ts"),
    v1.route("/test_webhook", "test_webhook.ts"),

    ...v1.prefix("/image_files", [
      v1.route("/", "image_files/index.ts"),
      v1.route("/:id", "image_files/detail.ts"),
      v1.route("/:id.json", "image_files/detail.json.ts"),
      v1.route("/md5/:md5", "image_files/md5.ts"),
      v1.route("/:id/upload", "image_files/upload.ts"),
      v1.route("/:id/delete", "image_files/delete.ts"),
    ]),

    ...v1.prefix("/isobmff_files", [
      v1.route("/", "isobmff_files/index.ts"),
      v1.route("/:id", "isobmff_files/detail.ts"),
      v1.route("/:id/index", "isobmff_files/indexFile.ts"),
      v1.route("/:id/index/upload", "isobmff_files/uploadIndex.ts"),
      v1.route("/:id/transcription", "isobmff_files/transcription.ts"),
      v1.route("/:id/transcribe", "isobmff_files/transcribe.ts"),
      v1.route("/:id/delete", "isobmff_files/delete.ts"),
      v1.route("/md5/:md5", "isobmff_files/md5.ts"),
    ]),

    ...v1.prefix("/isobmff_tracks", [
      v1.route("", "isobmff_tracks/create.ts"),
      v1.route("/:file_id/:track_id", "isobmff_tracks/trackData.ts"),
      v1.route("/:file_id/:track_id/upload", "isobmff_tracks/upload.ts"),
      v1.route("/:file_id/:track_id.json", "isobmff_tracks/detail.json.ts"),
    ]),

    ...v1.prefix("/files", [
      v1.route("/", "files/index.ts"),
      v1.route("/:id", "files/detail.ts"),
      v1.route("/:id/upload", "files/upload.ts"),
      v1.route("/:id/delete", "files/delete.ts"),
      v1.route("/:id/index", "files/indexFile.ts"),
      v1.route("/:id/index/upload", "files/indexUpload.ts"),
      v1.route("/:id/tracks", "files/trackCreate.ts"),
      v1.route("/:id/tracks/:trackId", "files/tracks.ts"),
      v1.route("/:id/tracks/:trackId/upload", "files/trackUpload.ts"),
      v1.route("/:id/transcribe", "files/transcribe.ts"),
      v1.route("/:id/transcription", "files/transcription.ts"),
      v1.route("/:id/progress", "files/progress.ts"),
      v1.route("/:id/content", "files/content.ts"),
      v1.route("/md5/:md5", "files/md5.ts"),
    ]),

    ...v1.prefix("/unprocessed_files", [
      v1.route("", "unprocessed_files/index.ts"),
      // TODO: add detail route
      // v1.route("/:id", "unprocessed_files/detail.ts"),
      v1.route("/:id/upload", "unprocessed_files/upload.ts"),
      v1.route("/:id/delete", "unprocessed_files/delete.ts"),
      v1.route("/:id/isobmff", "unprocessed_files/isobmff.ts"),
      v1.route("/md5/:md5", "unprocessed_files/md5.ts"),
    ]),

    ...v1.prefix("/process_isobmff", [
      v1.route("/:id", "process_isobmff/detail.ts"),
      v1.route("/:id/progress", "process_isobmff/progress.ts"),
    ]),

    ...v1.prefix("/renders", [
      v1.route("", "renders/index.ts"),
      v1.route("/:id.mp4", "renders/mp4.ts"),
      v1.route("/:id.png", "renders/png.ts"),
      v1.route("/:id.jpeg", "renders/jpeg.ts"),
      v1.route("/:id.webp", "renders/webp.ts"),
      v1.route("/:id.tgz", "renders/tgz.ts"),
      v1.route("/:id/progress", "renders/progress.ts"),
      v1.route("/:id/upload", "renders/upload.ts"),
      v1.route("/md5/:md5", "renders/md5.ts"),
      v1.route("/:id", "renders/detail.ts"),
    ]),

    ...v1.prefix("/transcription", [
      v1.route("/:id/progress", "transcription/progress.ts"),
      v1.route("/:id/fragment/:number", "transcription/fragment.ts"),
    ]),

    v1.route("/url-token", "url-token.ts"),
  ]),
  ]),

  ...hdb.prefix("/hdb", [
    hdb.route("/webhook_create_event", "webhook_create_event/index.ts"),
    hdb.route("/webhook_deliver_event", "webhook_deliver_event/index.ts"),
    hdb.route("/create_process_html", "create_process_html.ts"),
    hdb.route("/delete_files", "delete_files.ts"),
    hdb.route("/delete_image_files", "delete_image_files.ts"),
    hdb.route("/delete_isobmff_files", "delete_isobmff_files.ts"),
    hdb.route("/delete_isobmff_tracks", "delete_isobmff_tracks.ts"),
    hdb.route("/delete_unprocessed_files", "delete_unprocessed_files.ts"),
    hdb.route(
      "/deliver_api_key_expired_reminder",
      "deliver_api_key_expired_reminder.tsx",
    ),
    hdb.route("/deliver_confirmation_email", "deliver_confirmation_email.tsx"),
    hdb.route("/deliver_invitation_email", "deliver_invitation_email.tsx"),
    hdb.route("/deliver_magic_link_email", "deliver_magic_link_email.tsx"),
    hdb.route(
      "/deliver_new_api_email_notification",
      "deliver_new_api_email_notification.tsx",
    ),
    hdb.route(
      "/deliver_reset_password_email",
      "deliver_reset_password_email.tsx",
    ),
    hdb.route(
      "/deliver_update_password_email",
      "deliver_update_password_email.tsx",
    ),
    hdb.route("/onboarding", "onboarding.tsx"),
    hdb.route("/send_render_completed_slack", "send_render_completed_slack.ts"),
    hdb.route("/send_slack_notification", "send_slack_notification.ts"),
    hdb.route("/test_webhook_url", "test_webhook_url.ts"),
    hdb.route("/process_isobmff", "process_isobmff.ts"),
    hdb.route("/reap_expired_files", "reap_expired_files.ts"),
  ]),
] satisfies RouteConfig;

export default routes;
