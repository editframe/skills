import express from "express";
import morgan from "morgan";
import path from "node:path";

// Short-circuit the type-checking of the built output.
const PROD_BUILD_PATH = "/app/services/web/build/server/index.js";
const PROD_BUILD_CLIENT_PATH = "/app/services/web/build/client";
const PROD_BUILD_ASSETS_PATH = "/app/services/web/build/client/assets";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.disable("x-powered-by");

console.log("NODE_ENV", process.env.NODE_ENV);
const __dirname = path.dirname(new URL(import.meta.url).pathname);


const imagesDir = path.resolve(__dirname, "public/images");

app.use("/images", express.static(imagesDir, { maxAge: "1h" }));

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      configFile: "/app/services/web/vite.config.ts",
      server: { middlewareMode: true },
    })
  );
  app.use(viteDevServer.middlewares);
  app.use(
    "/assets",
    express.static(path.resolve(__dirname, "public/assets"))
  );
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("/app/services/web/server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static(PROD_BUILD_ASSETS_PATH, { immutable: true, maxAge: "1y" })
  );
  app.use(express.static(PROD_BUILD_CLIENT_PATH, { maxAge: "1h" }));
  app.use(await import(PROD_BUILD_PATH).then((mod) => mod.app));
}


app.use(morgan("tiny"));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});