import {
  Form,
  type FormProps,
  useActionData,
  useNavigation,
  useFormAction,
} from "react-router";
import type * as z from "zod";
import type { FC, PropsWithChildren } from "react";
import { parseFormData } from "./parseFormData";
import { XCircleIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

import { useState, useRef, useEffect } from "react";
import { Button } from "./components/Button";
import { Listbox as BaseListbox } from "./components/Listbox";

function Field(
  props: PropsWithChildren<{
    label?: string;
    error?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  }>,
) {
  return (
    <div
      className={clsx(
        "rounded-sm",
        props.error && "border-l-2 border-red-300 pl-3 bg-red-50/30",
      )}
      onClick={props.onClick}
    >
      <div className="flex items-baseline gap-4 mb-2">
        {props.label && (
          <label className="block font-medium text-gray-900 text-sm leading-6">
            {props.label}
          </label>
        )}
        {props.error && (
          <span className="text-red-600 text-xs">{props.error}</span>
        )}
      </div>
      {props.children}
    </div>
  );
}

export function formFor<Output, Input>(
  _schema: z.ZodType<Output, z.ZodTypeDef, Input>,
) {
  type Schema = typeof _schema;
  type Fields = keyof z.inferFlattenedErrors<Schema>["fieldErrors"];

  function FieldError({ field }: { field: Fields }) {
    const actionData = useActionData() as {
      fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
      formErrors?: z.inferFlattenedErrors<Schema>["formErrors"];
    };

    if (!actionData?.fieldErrors) return null;
    if (actionData.fieldErrors[field]) {
      return (
        <div className="bg-red-50 my-4 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon
                className="w-5 h-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="text-red-700 text-sm">
                <ul className="space-y-1 pl-5">
                  {actionData.fieldErrors[field]?.map((error) => (
                    <li> {error} </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  function Input({
    field,
    label,
    description,
    ...props
  }: {
    field: Fields;
    label?: string;
    description?: string;
  } & React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >) {
    const actionData = useActionData() as {
      fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
    };
    const [error] = actionData?.fieldErrors?.[field] ?? [];

    return (
      <Field label={label} error={error}>
        <input
          name={field as string}
          aria-label={label}
          className={clsx(
            "block border-0 border-gray-300 disabled:bg-gray-50 shadow-sm mt-1 py-1.5 focus:border-blue-500 rounded-md ring-1 focus:ring-2 focus:ring-blue-500 disabled:ring-gray-200 focus:ring-inset w-full max-w-lg text-gray-900 text-xs sm:text-sm disabled:text-gray-500 placeholder:text-gray-400 sm:leading-6 disabled:cursor-not-allowed",
            error ? "ring-red-300 focus:ring-red-500" : "ring-gray-300",
            props.className,
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {description && (
          <p className="flex gap-1 pt-2 text-athens-gray-600 text-xs align-baseline">
            {description}
          </p>
        )}
      </Field>
    );
  }

  function Checkbox({
    field,
    label,
    description,
    array,
    ...props
  }: {
    field: Fields;
    label: string;
    description?: string;
    array?: boolean;
  } & React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >) {
    const actionData = useActionData() as {
      fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
    };
    const [error] = actionData?.fieldErrors?.[field] ?? [];

    return (
      <Field
        label={label}
        error={error}
        onClick={(e) => {
          // This expands the clickable area of the checkbox to include wrapping div.
          // We have to be careful not to trigger a double click on the checkbox, or it will
          // make it unclickable.
          if (!(e.target instanceof HTMLInputElement)) {
            (
              e.currentTarget.querySelector(
                "[type='checkbox']",
              ) as HTMLInputElement
            )?.click();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name={`${field as string}${array ? "[]" : ""}`}
            className={clsx(
              "border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500",
              "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
              error && "border-red-300 focus:ring-red-500",
            )}
            {...props}
          />
          {description && (
            <p className="text-gray-500 text-xs">{description}</p>
          )}
        </div>
      </Field>
    );
  }

  function Select({
    field,
    options = [],
    label,
    description,
    defaultValue,
    ...props
  }: {
    field: Fields;
    options: {
      value: string;
      label: string;
      selected?: boolean;
    }[];
    label: string;
    description?: string;
    defaultValue?: string;
  } & React.DetailedHTMLProps<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >) {
    const actionData = useActionData() as {
      fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
    };
    const hasError = actionData?.fieldErrors?.[field];
    const [selected, setSelected] = useState(
      defaultValue ??
        options.find((option) => option.selected)?.value ??
        options[0]?.value,
    );
    const selectRef = useRef<HTMLSelectElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    return (
      <Field
        label={label}
        error={hasError ? actionData?.fieldErrors?.[field]?.[0] : undefined}
      >
        <BaseListbox
          value={selected ?? ""}
          onChange={setSelected}
          options={options}
          label={label}
          disabled={!isMounted}
          error={!!hasError}
        />
        {description && (
          <p className="flex gap-1 pt-2 text-athens-gray-600 text-xs align-baseline">
            {description}
          </p>
        )}

        {/* Hidden select for form submission */}
        <select
          {...props}
          className="hidden"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          ref={selectRef}
          name={field as string}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  function TextArea({
    field,
    label,
    ...props
  }: {
    field: Fields;
    label?: string;
  } & React.DetailedHTMLProps<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >) {
    const actionData = useActionData() as {
      fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
    };
    const hasError = actionData?.fieldErrors?.[field];

    return (
      <Field
        label={label}
        error={hasError ? actionData?.fieldErrors?.[field]?.[0] : undefined}
      >
        <textarea
          name={field as string}
          className={clsx(
            "block border-0 shadow-sm py-1.5 rounded-md ring-1 focus:ring-2 focus:ring-martinique-600 ring-inset focus:ring-inset w-full text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6",
            hasError ? "ring-red-300 focus:ring-red-500" : "ring-gray-300",
          )}
          aria-invalid={hasError ? "true" : undefined}
          {...props}
        />
      </Field>
    );
  }

  function FormErrors() {
    const actionData = useActionData() as {
      formErrors?: z.inferFlattenedErrors<Schema>["formErrors"];
      fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
    };
    if (actionData?.formErrors && actionData.formErrors.length > 0) {
      return (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon
                className="w-5 h-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="text-red-700 text-sm">
                <ul className="space-y-1 pl-5 list-none">
                  {actionData.formErrors.map((error) => (
                    <li> {error} </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  function HiddenInput({
    field,
    ...props
  }: { field: Fields } & React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >) {
    return <input type="hidden" name={field as string} {...props} />;
  }

  const Success: FC<PropsWithChildren> = ({ children }) => {
    const actionData = useActionData() as
      | {
          formErrors?: z.inferFlattenedErrors<Schema>["formErrors"];
          fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
        }
      | undefined;

    if (actionData === undefined) return null;
    if (actionData.formErrors || actionData.fieldErrors) return null;

    return <>{children}</>;
  };

  const Failure: FC<PropsWithChildren> = ({ children }) => {
    const actionData = useActionData() as
      | {
          formErrors?: z.inferFlattenedErrors<Schema>["formErrors"];
          fieldErrors?: z.inferFlattenedErrors<Schema>["fieldErrors"];
        }
      | undefined;
    if (actionData === undefined) return null;
    if (!actionData.formErrors && !actionData.fieldErrors) return null;
    return <>{children}</>;
  };

  const Submit: FC<PropsWithChildren> = ({ children }) => {
    const navigation = useNavigation();
    const formAction = useFormAction();
    const isSubmitting =
      navigation.state === "submitting" && navigation.formAction === formAction;

    const buttonRef = useRef<HTMLButtonElement>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
      const form =
        buttonRef.current?.form || buttonRef.current?.closest("form");
      if (!form) return;

      const checkInitialChanges = () => {
        const formElements = Array.from(form.elements) as HTMLFormElement[];
        return formElements.some((element) => {
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            return element.value !== (element.defaultValue ?? "");
          }
          if (element instanceof HTMLSelectElement) {
            const defaultOption = Array.from(element.options).find(
              (opt) => opt.defaultSelected,
            );
            return element.value !== (defaultOption?.value ?? "");
          }
          return false;
        });
      };

      setHasChanges(checkInitialChanges());

      const handleInput = () => setHasChanges(true);
      const handleSubmit = () => setHasChanges(false);

      form.addEventListener("input", handleInput);
      form.addEventListener("submit", handleSubmit);

      return () => {
        form.removeEventListener("input", handleInput);
        form.removeEventListener("submit", handleSubmit);
      };
    }, []);

    return (
      <Button
        type="submit"
        mode="primary"
        disabled={!hasChanges || isSubmitting}
        title={!hasChanges ? "No changes to save" : undefined}
        className={clsx(
          "transition-colors duration-200",
          isSubmitting && "bg-amber-50 text-amber-700 hover:bg-amber-100",
          !hasChanges && "bg-gray-100 text-gray-500 hover:bg-gray-100",
          hasChanges &&
            !isSubmitting &&
            "bg-green-50 text-green-700 hover:bg-green-100",
        )}
        ref={buttonRef}
      >
        {isSubmitting ? "Saving..." : children}
      </Button>
    );
  };

  return {
    async parseFormData(request: Request) {
      const result = await parseFormData(request, _schema);
      if (result.success === false) {
        return {
          success: false,
          errors: result.error.flatten(),
        } as const;
      }
      return result;
    },
    Form: (props: PropsWithChildren & FormProps) => (
      <Form method="post" {...props} />
    ),
    Input,
    Checkbox,
    Select,
    TextArea,
    HiddenInput,
    FieldError,
    FormErrors,
    Field,
    Success,
    Failure,
    Submit,
  };
}
