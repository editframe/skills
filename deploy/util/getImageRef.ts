import { execSync } from "node:child_process";
import { getGitSha } from "./getGitSha";

const REPO = "us-central1-docker.pkg.dev/editframe/telecine-artifacts";

/**
 * Resolves a Docker image reference by content digest from Artifact Registry.
 *
 * Returns `REPO/name@sha256:...` when the digest can be resolved, which means
 * Pulumi will see no diff if the built output is identical across commits.
 *
 * Falls back to `REPO/name:TAG` (tag-based) if the digest lookup fails,
 * ensuring deploys still work when running locally or when the image hasn't
 * been pushed yet.
 */
export const getImageRef = (name: string): string => {
  const tag = getGitSha();
  const tagged = `${REPO}/${name}:${tag}`;

  try {
    const digest = execSync(
      `gcloud artifacts docker images describe ${tagged} --format='value(image_summary.digest)'`,
      { encoding: "utf-8", timeout: 15_000, stdio: ["pipe", "pipe", "pipe"] },
    ).trim();

    if (digest && digest.startsWith("sha256:")) {
      return `${REPO}/${name}@${digest}`;
    }
  } catch {
    // Image not in registry yet (local dev, first push, etc.)
  }

  return tagged;
};
