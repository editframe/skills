import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  appDirectory: "./services/web/app",
  buildDirectory: "./services/web/build",
  future: {
    v8_middleware: true,
  },
} satisfies Config;
