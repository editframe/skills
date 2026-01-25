import { Page } from "playwright";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export interface ProfileOptions {
  enabled: boolean;
  outputPath?: string;
}

export async function withProfiling<T>(
  page: Page,
  options: ProfileOptions,
  fn: () => Promise<T>
): Promise<T> {
  if (!options.enabled) {
    return await fn();
  }

  // Get CDP session
  const client = await page.context().newCDPSession(page);
  
  // Start profiling
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 100 }); // 100μs
  await client.send('Profiler.start');
  
  console.error('🔬 CPU profiling started...');
  const startTime = Date.now();
  
  // Run the render
  const result = await fn();
  
  // Stop profiling
  const { profile } = await client.send('Profiler.stop');
  await client.send('Profiler.disable');
  
  const duration = Date.now() - startTime;
  console.error(`✅ CPU profiling complete (${(duration/1000).toFixed(1)}s)`);
  
  // Save profile
  const outputPath = options.outputPath || './render-profile.cpuprofile';
  const absolutePath = path.resolve(process.cwd(), outputPath);
  await writeFile(absolutePath, JSON.stringify(profile, null, 2));
  console.error(`💾 Profile saved to: ${absolutePath}`);
  
  // Basic analysis
  const samples = profile.samples?.length || 0;
  console.error(`📊 Captured ${samples.toLocaleString()} samples`);
  
  // Calculate hotspots
  const hitCounts = new Map<number, number>();
  if (profile.samples) {
    for (const sample of profile.samples) {
      hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
    }
  }
  
  // Find top functions
  const hotspots = profile.nodes
    .map((node: any) => ({
      name: node.callFrame.functionName || '(anonymous)',
      url: node.callFrame.url,
      line: node.callFrame.lineNumber,
      hits: hitCounts.get(node.id) || 0,
    }))
    .filter(h => h.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 20);
  
  if (hotspots.length > 0) {
    console.error('\n📊 Top 20 Hotspots:');
    for (const h of hotspots) {
      const file = h.url.split('/').pop() || h.url;
      console.error(`  ${h.hits.toString().padStart(6)} samples | ${h.name} @ ${file}:${h.line}`);
    }
  }
  
  return result;
}
