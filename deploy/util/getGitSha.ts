/**
 * Retrieves the current Git SHA (commit hash) from the environment or local repository.
 * 
 * @returns {string} The current Git SHA if available:
 *   - From GITHUB_SHA environment variable when running in GitHub Actions
 *   - From local git repository using 'git rev-parse HEAD'
 *   - Falls back to 'latest' if neither source is available
 * 
 * @throws {never} Catches and handles all errors internally
 * 
 * @example
 * const sha = getGitSha();
 * // => '8d9f8e7b6c5a4b3a2c1d0e9f8e7b6c5a' (actual SHA)
 * // or 'latest' if SHA cannot be determined
 */
export const getGitSha = (): string => {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }

  try {
    return require('node:child_process').execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.warn('Failed to get git SHA, falling back to "latest":', error);
    return 'latest';
  }
};
