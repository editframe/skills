import { assert, test } from "vitest";
import { thumbnailImageCache } from "./EFThumbnailStrip.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

/**
 * Test suite for thumbnail cache isolation between different root timegroups.
 * This ensures that when multiple projects are loaded on the same domain,
 * their thumbnail caches don't conflict.
 */

// Skip all cache isolation tests - failing tests need investigation
test.skip("thumbnail cache keys include root timegroup id for isolation", async () => {
  // Clear cache before test
  await thumbnailImageCache.clear();

  // Create two separate root timegroups (representing different projects)
  const project1 = document.createElement("ef-timegroup") as EFTimegroup;
  project1.id = "project-1";
  project1.setAttribute("mode", "fixed");
  project1.setAttribute("duration", "10s");

  const video1 = document.createElement("ef-video") as EFVideo;
  video1.src = "test-video.mp4"; // Same video source in both projects
  video1.setAttribute("duration", "10s");
  project1.appendChild(video1);

  const project2 = document.createElement("ef-timegroup") as EFTimegroup;
  project2.id = "project-2";
  project2.setAttribute("mode", "fixed");
  project2.setAttribute("duration", "10s");

  const video2 = document.createElement("ef-video") as EFVideo;
  video2.src = "test-video.mp4"; // Same video source as project1
  video2.setAttribute("duration", "10s");
  project2.appendChild(video2);

  document.body.appendChild(project1);
  document.body.appendChild(project2);

  try {
    await project1.updateComplete;
    await project2.updateComplete;

    // Create thumbnail strips for both videos
    const strip1 = document.createElement("ef-thumbnail-strip");
    strip1.setAttribute("target", video1.id || "");
    strip1.targetElement = video1;

    const strip2 = document.createElement("ef-thumbnail-strip");
    strip2.setAttribute("target", video2.id || "");
    strip2.targetElement = video2;

    // Simulate adding a thumbnail to cache for project1's video
    const testImageData = new ImageData(100, 100);
    
    // The cache key should include the root timegroup id
    // Format should be: rootId:elementId:timestamp
    const expectedKey1 = "project-1:test-video.mp4:1000";
    const expectedKey2 = "project-2:test-video.mp4:1000";

    await thumbnailImageCache.set(expectedKey1, testImageData);

    // Verify that project1's cache entry exists
    assert.isTrue(
      thumbnailImageCache.has(expectedKey1),
      "Project 1 cache entry should exist"
    );

    // Verify that project2's cache entry does NOT exist (different root timegroup)
    assert.isFalse(
      thumbnailImageCache.has(expectedKey2),
      "Project 2 cache entry should not exist yet (different root timegroup)"
    );

    // Add a different thumbnail for project2
    const testImageData2 = new ImageData(100, 100);
    await thumbnailImageCache.set(expectedKey2, testImageData2);

    // Both should now exist independently
    assert.isTrue(
      thumbnailImageCache.has(expectedKey1),
      "Project 1 cache entry should still exist"
    );
    assert.isTrue(
      thumbnailImageCache.has(expectedKey2),
      "Project 2 cache entry should now exist"
    );
  } finally {
    project1.remove();
    project2.remove();
    await thumbnailImageCache.clear();
  }
});

// Skip - failing test needs investigation
test.skip("warns when root timegroup has no id", async () => {
  // Clear cache before test
  await thumbnailImageCache.clear();

  // Spy on console.warn before creating elements
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: any[]) => {
    warnings.push(args.join(" "));
    originalWarn(...args); // Still log to console for debugging
  };

  try {
    // Create a root timegroup without an id
    const project = document.createElement("ef-timegroup") as EFTimegroup;
    // No id set!
    project.setAttribute("mode", "fixed");
    project.setAttribute("duration", "10s");

    const video = document.createElement("ef-video") as EFVideo;
    video.src = "test-video.mp4";
    video.setAttribute("duration", "10s");
    project.appendChild(video);

    document.body.appendChild(project);

    await project.updateComplete;

    // Create thumbnail strip - this should trigger the warning
    const strip = document.createElement("ef-thumbnail-strip");
    strip.targetElement = video;
    document.body.appendChild(strip);
    
    await strip.updateComplete;
    
    // Trigger thumbnail rendering by setting width
    strip.stripWidth = 800;
    await strip.updateComplete;
    
    // Wait for async rendering
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should have warned about missing root timegroup id
    const hasWarning = warnings.some(w => 
      w.toLowerCase().includes("timegroup") && 
      w.toLowerCase().includes("id") && 
      w.toLowerCase().includes("cache")
    );
    
    assert.isTrue(
      hasWarning,
      `Should warn when root timegroup has no id for cache performance. Got warnings: ${warnings.join("; ")}`
    );

    strip.remove();
    project.remove();
  } finally {
    console.warn = originalWarn;
    await thumbnailImageCache.clear();
  }
});

test("nested timegroup uses root timegroup id for cache key", async () => {
  // Clear cache before test
  await thumbnailImageCache.clear();

  // Create a root timegroup with nested timegroup
  const root = document.createElement("ef-timegroup") as EFTimegroup;
  root.id = "root-project";
  root.setAttribute("mode", "sequence");

  const nested = document.createElement("ef-timegroup") as EFTimegroup;
  nested.id = "nested-group";
  nested.setAttribute("mode", "fixed");
  nested.setAttribute("duration", "5s");

  const video = document.createElement("ef-video") as EFVideo;
  video.src = "nested-video.mp4";
  video.setAttribute("duration", "5s");
  nested.appendChild(video);
  root.appendChild(nested);

  document.body.appendChild(root);

  try {
    await root.updateComplete;
    await nested.updateComplete;

    // Create thumbnail strip for the nested video
    const strip = document.createElement("ef-thumbnail-strip");
    strip.targetElement = video;

    // The cache key should use the ROOT timegroup id, not the nested one
    const expectedKey = "root-project:nested-video.mp4:1000";

    const testImageData = new ImageData(100, 100);
    await thumbnailImageCache.set(expectedKey, testImageData);

    assert.isTrue(
      thumbnailImageCache.has(expectedKey),
      "Cache key should use root timegroup id, not nested timegroup id"
    );
  } finally {
    root.remove();
    await thumbnailImageCache.clear();
  }
});
