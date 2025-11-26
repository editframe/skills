// Simple test script for executeInElectron.test.ts
import opentelemetry from "@opentelemetry/api";

const tracer = opentelemetry.trace.getTracer("test-script");

const span = tracer.startSpan("success");
span.setAttribute("test.name", "success");
console.log("✅ Test script executed successfully");
span.end();

export {};
