import { createServer } from "node:http";
import { healthCheck } from "@/http/healthCheck";

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000;

const server = createServer((req, res) => {
  if (!healthCheck(req, res)) {
    res.writeHead(404).end();
  }
});

console.log(`worker-render-fragment binding to port ${PORT}`);
server.listen(PORT, () => {
  console.log(`worker-render-fragment listening on port ${PORT} (health checks ready)`);
  import("./boot").then(({ init }) => init(server)).catch((err) => {
    console.error("Worker boot failed:", err);
    process.exit(1);
  });
});
