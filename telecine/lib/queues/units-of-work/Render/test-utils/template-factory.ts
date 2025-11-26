/**
 * Create a simple video template for testing
 */
export function createSimpleVideoTemplate(): string {
  return `
    <html>
      <head>
        <title>Simple Test Video</title>
      </head>
      <body style="background: #ff0000; width: 100vw; height: 100vh; margin: 0;">
        <div style="color: white; font-size: 24px; text-align: center; padding-top: 50vh;">
          Simple Test Video
        </div>
      </body>
    </html>
  `;
}

/**
 * Create a color-changing template for testing
 */
export function createColorChangingTemplate(): string {
  return `
    <html>
      <head>
        <title>Color Changing Test Video</title>
      </head>
      <body style="margin: 0;">
        <div id="container" style="width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="color: white; font-size: 24px;">Color Changing Test</div>
        </div>
        <script>
          const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
          let colorIndex = 0;
          const container = document.getElementById('container');
          
          function changeColor() {
            container.style.backgroundColor = colors[colorIndex];
            colorIndex = (colorIndex + 1) % colors.length;
          }
          
          // Change color every 200ms
          setInterval(changeColor, 200);
          changeColor(); // Initial color
        </script>
      </body>
    </html>
  `;
}

/**
 * Write template to test assets directory
 */
export async function writeTemplateToAssets(
  template: string,
  filename: string,
): Promise<string> {
  const { writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const assetsDir = join(process.cwd(), "temp", "test-assets");
  const filePath = join(assetsDir, filename);

  // Ensure directory exists
  const { mkdir } = await import("node:fs/promises");
  await mkdir(assetsDir, { recursive: true });

  await writeFile(filePath, template, "utf8");
  return filePath;
}
