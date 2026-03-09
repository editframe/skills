import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import path from "node:path";

export interface ChromeDetectionResult {
  found: boolean;
  path?: string;
  error?: string;
}

/**
 * Detects if Google Chrome is installed on the system.
 * Returns the path to Chrome executable if found.
 */
export function detectChrome(): ChromeDetectionResult {
  const osPlatform = platform();

  if (osPlatform === "darwin") {
    // macOS: Check for Google Chrome.app
    const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (existsSync(chromePath)) {
      return { found: true, path: chromePath };
    }

    // Also check for Chromium
    const chromiumPath = "/Applications/Chromium.app/Contents/MacOS/Chromium";
    if (existsSync(chromiumPath)) {
      return { found: true, path: chromiumPath };
    }

    return {
      found: false,
      error: "Chrome not found in /Applications/Google Chrome.app",
    };
  }

  if (osPlatform === "linux") {
    // Linux: Try to find chrome/chromium via which
    try {
      const chromePath = execSync("which google-chrome", {
        encoding: "utf-8",
      }).trim();
      if (chromePath && existsSync(chromePath)) {
        return { found: true, path: chromePath };
      }
    } catch {
      // google-chrome not found, try chromium
    }

    try {
      const chromiumPath = execSync("which chromium", {
        encoding: "utf-8",
      }).trim();
      if (chromiumPath && existsSync(chromiumPath)) {
        return { found: true, path: chromiumPath };
      }
    } catch {
      // chromium not found
    }

    try {
      const chromiumBrowserPath = execSync("which chromium-browser", {
        encoding: "utf-8",
      }).trim();
      if (chromiumBrowserPath && existsSync(chromiumBrowserPath)) {
        return { found: true, path: chromiumBrowserPath };
      }
    } catch {
      // chromium-browser not found
    }

    return {
      found: false,
      error: "Chrome not found. Install with: apt-get install google-chrome-stable",
    };
  }

  if (osPlatform === "win32") {
    // Windows: Check common installation paths
    const possiblePaths = [
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(
        process.env["PROGRAMFILES(X86)"] || "",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe",
      ),
    ];

    for (const chromePath of possiblePaths) {
      if (existsSync(chromePath)) {
        return { found: true, path: chromePath };
      }
    }

    return {
      found: false,
      error: "Chrome not found in common Windows installation paths",
    };
  }

  return {
    found: false,
    error: `Unsupported platform: ${osPlatform}`,
  };
}

/**
 * Throws a user-friendly error if Chrome is not found.
 */
export function requireChrome(): string {
  const result = detectChrome();
  if (!result.found) {
    throw new Error(
      `Chrome browser not found.\n\n` +
        `The render command requires Google Chrome to be installed on your system.\n\n` +
        `Install Chrome from: https://www.google.com/chrome/\n` +
        (result.error ? `\nDetails: ${result.error}` : ""),
    );
  }
  return result.path!;
}
