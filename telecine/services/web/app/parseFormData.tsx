import type z from "zod";

export async function parseFormData<Output, Input>(
  request: Request,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
) {
  const formData = await request.formData();

  // Create an object to store grouped values
  const grouped: Record<string, string[]> = {};

  // Group all values by their keys, removing [] for array keys
  for (const [key, value] of formData.entries()) {
    const cleanKey = key.replace(/\[\]$/, "");
    if (!grouped[cleanKey]) {
      grouped[cleanKey] = [];
    }
    grouped[cleanKey].push(value.toString());
  }

  // Convert to final format - use [] suffix to determine if it should be an array
  const formObject = Object.fromEntries(
    Object.entries(grouped).map(([key, values]) => [
      key,
      formData.has(`${key}[]`) ? values : values[0],
    ]),
  ) as unknown;

  return schema.safeParse(formObject);
}
