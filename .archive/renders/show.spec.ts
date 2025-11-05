import type { Renders } from "@/sql-client.server";
import { test, expect } from "../../tests/util/test";
import { makeRenderFixture } from "./makeRenderFixture";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/renders/show");
});

const showTest = test.extend<{ videoRender: Renders; navigate: undefined }>({
  navigate: [
    async ({ page, videoRender, signInAs, uniqueUser }, use) => {
      await signInAs(uniqueUser);
      await page.goto(`/renders/${videoRender.id}`);
      await use(undefined);
    },
    { auto: true },
  ],

  videoRender: makeRenderFixture({ id: "test-id" }),
});

showTest(
  "Must be the creator of the render to view it",
  async ({ page, videoRender, signInAs, otherUser }) => {
    await signInAs(otherUser);
    await page.goto(`/renders/${videoRender.id}`);
    await expect(page.getByText("Render not Found")).toBeVisible();
  },
);

showTest("Shows the render", async ({ page, videoRender }) => {
  await expect(page.getByText(`Show Render ${videoRender.id}`)).toBeVisible();
});
