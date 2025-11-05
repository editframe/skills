import { registerRcpHandler, keepalive } from "../RPC";

registerRcpHandler("testCall", async (params, ctx) => {
  return {
    arg1: params[0].arg1,
    arg2: params[0].arg2,
  };
});

// Example of a long-running handler that sends keepalives
registerRcpHandler("longRunningTask", async (params, ctx) => {
  const { durationMs = 10000 } = params[0] || {};
  const keepaliveInterval = 5000; // Send keepalive every 5 seconds

  const startTime = Date.now();

  const keepaliveTimer = setInterval(() => {
    ctx.sendKeepalive();
  }, keepaliveInterval);

  try {
    // Simulate long-running work
    await new Promise(resolve => setTimeout(resolve, durationMs));

    return {
      completedAt: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  } finally {
    clearInterval(keepaliveTimer);
  }
});

await keepalive.promise;