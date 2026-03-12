import assert from "node:assert";
import path, { dirname } from "node:path";
import nodeTest, { describe, after } from "node:test";
import { ElectronEngine } from "../ElectronEngine";
import type { VideoRenderOptions } from "../../FramegenEngine";
import { fileURLToPath } from "node:url";
import { webContents } from "../../../../electron-exec/electronReExport";

const __dirname = fileURLToPath(dirname(import.meta.url));

const crashOnError = (testFn: () => Promise<void> | void) => {
  return async () => {
    try {
      await testFn();
    } catch (error) {
      if (process.env.CI) {
        console.trace("Test Failed", error);
        process.exit(1);
      }
      throw error;
    }
  };
};

const test = (name: string, testFn: () => Promise<void> | void) => {
  return nodeTest(name, crashOnError(testFn));
};

describe("ElectronEngine", () => {
  after(async () => {
    // Some tests leave webContents open. In order to prevent running out of resources,
    // we close any leftover webContents. There is one webContents that needs to stay open
    // to keep the Electron app alive. That has been loaded with a keepAlive flag so we skip it.
    for (const contents of webContents.getAllWebContents()) {
      // But we do want to exit if we're running in CI
      if (!process.env.CI) {
        if (contents.getURL() === "about:blank?keepAlive=true") {
          continue;
        }
      }
      contents.close();
    }
  });

  test("can be closed", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    console.log("ERROR", error);
    assert(!error, "Error creating engine");

    await engine.close();

    assert(engine.isClosed, "Engine closed");
  });

  test("initializes", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "Error creating engine");

    await engine.initialize({} as VideoRenderOptions);

    assert(engine.isInitialized, "Engine initialized");
    await engine.close();
  });

  test("emits unhandled errors", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, _engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "Error creating engine");
  });

  test("errors if resource fails to load", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.load-failure.html",
    );
    const [error, _engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
      loadTimeoutMs: 1000,
    });

    assert(error instanceof Error, "Error is an error");
    assert.match(
      error.message,
      /Failed to load \/app\/services\/render\/src\/engines\/ElectronEngine\/test\/fixtures\/ElectronEngine\.load-failure\.html in 1000ms/,
      "Error message",
    );
  });

  test("reports uncaught errors after initialization", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "No error");
    await engine.initialize({} as VideoRenderOptions);

    const errors: Error[] = [];
    engine.onError((error) => {
      errors.push(error);
    });

    await engine.webContents
      .executeJavaScript(/* JS */ `
        throw new Error('Uncaught error after initialization');
    `)
      .catch(() => {
        /* no-op, we want to simulate uncaught errors */
      });

    assert.deepEqual(
      errors,
      [new Error("Uncaught error after initialization")],
      "Errors",
    );
  });

  test("reports uncaught rejections after initialization", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "No error");
    await engine.initialize({} as VideoRenderOptions);

    const errors: Error[] = [];
    engine.onError((error) => {
      errors.push(error);
    });

    await engine.webContents
      .executeJavaScript(/* JS */ `
        // We have to void the promise so electron's executeJavaScript doesn't catch it
        void Promise.reject(new Error('Uncaught rejection after initialization'));
    `)
      .catch(() => {
        /* no-op, we want to simulate uncaught errors */
      });

    // We have to pump another tick through the browser to ensure we can capture the prior uncaught rejection
    await engine.webContents.executeJavaScript(/* JS */ `
      Promise.resolve()
    `);

    assert.deepEqual(
      errors,
      [new Error("Uncaught rejection after initialization")],
      "Errors",
    );
  });

  test("reports explicit errors", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "No error");

    await engine.initialize({} as VideoRenderOptions);

    const errors: Error[] = [];
    engine.onError((error) => {
      errors.push(error);
    });

    await engine.webContents.executeJavaScript(/* JS */ `
      FRAMEGEN_BRIDGE.error(new Error('Explicit error'));
    `);

    assert.deepEqual(errors, [new Error("Explicit error")], "Errors");
  });

  test("beginFrame waits for a frame to be ready", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "No error");

    await engine.initialize({} as VideoRenderOptions);

    const framePromise = engine.beginFrame(0, true);

    engine.webContents.executeJavaScript(/* JS */ `
      FRAMEGEN_BRIDGE.frameReady(0, new Uint8Array([0, 0, 0, 0]));
    `);

    const frame = await framePromise;

    assert(frame.length > 0, "Frame is ready");
  });

  test("beginFrame times out if frame is not ready frame budget", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "No error");

    await engine.initialize({} as VideoRenderOptions);

    const framePromise = engine.beginFrame(0, true, 100);

    await assert.rejects(
      framePromise,
      /FRAMEGEN BeginFrame timeout. Failed to receive 'frame' event within 100ms/,
    );
  });

  test("captureFrame captures a frame at 4 bytes per pixel", async () => {
    const testfile = path.join(
      __dirname,
      "fixtures",
      "ElectronEngine.test.html",
    );
    const [error, engine] = await ElectronEngine.create({
      width: 100,
      height: 100,
      location: testfile,
      jwt: "test",
    });

    assert(!error, "No error");

    await engine.initialize({} as VideoRenderOptions);

    const frame = await engine.captureFrame(0, 30);

    assert.equal(frame.byteLength, 100 * 100 * 4, "Frame is correct size");
  });
});
