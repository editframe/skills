import { data } from "react-router";
import type z from "zod";

export function formatFormErrors(result: z.SafeParseError<any>) {
  const flatErrors = result.error.flatten();
  return data(
    {
      fieldErrors: flatErrors.fieldErrors,
      formErrors: flatErrors.formErrors,
    },
    {
      status: 400,
    },
  );
}
