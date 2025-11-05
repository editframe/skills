import ora from "ora";

export const withSpinner = async <T extends any | undefined>(
  label: string,
  fn: () => Promise<T>,
) => {
  const spinner = ora(label).start();
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
};
