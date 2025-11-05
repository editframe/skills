/**
 * Creates a test fragment index for testing fragmented media functionality
 */
export interface TestFragmentIndexOptions {
  fragment_count?: number;
  base_url?: string;
  duration?: number;
}

export function createTestFragmentIndex(
  options: TestFragmentIndexOptions = {},
) {
  return {
    fragment_count: options.fragment_count ?? 10,
    base_url: options.base_url ?? "http://localhost/test",
    duration: options.duration ?? 1000,
    fragments: Array.from({ length: options.fragment_count ?? 10 }, (_, i) => ({
      index: i,
      start_time: i * 100,
      duration: 100,
      url: `${options.base_url ?? "http://localhost/test"}/fragment-${i}.mp4`,
    })),
    ...options,
  };
}
