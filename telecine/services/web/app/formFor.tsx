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
import { XCircle } from "@phosphor-icons/react";
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
        props.error && "border-l-2 border-red-400 dark:border-red-500 pl-4 bg-red-50/50 dark:bg-red-950/30",
      )}
      onClick={props.onClick}
    >
      <div className="flex items-baseline justify-between gap-4 mb-1">
        {props.label && (
          <label className={clsx(
            "block font-medium text-sm leading-snug transition-colors",
            "text-slate-900 dark:text-white"
          )}>
            {props.label}
          </label>
        )}
        {props.error && (
          <span className={clsx(
            "text-xs font-medium leading-snug transition-colors",
            "text-red-600 dark:text-red-400"
          )}>
            {props.error}
          </span>
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
        <div className="bg-red-50 dark:bg-red-950/30 my-4 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle
                className="w-5 h-5 text-red-400 dark:text-red-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="text-red-700 dark:text-red-400 text-sm">
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
            "block w-full max-w-lg mt-1 px-3 py-2 rounded-lg text-sm leading-snug transition-all duration-150 disabled:cursor-not-allowed relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-slate-100",
            "border border-slate-300/75 dark:border-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(59_130_246_/_0.22)] dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(59_130_246_/_0.35)]",
            "focus:before:from-blue-50/30 focus:before:via-transparent focus:before:to-transparent",
            "dark:focus:before:from-blue-950/22 dark:focus:before:via-transparent dark:focus:before:to-transparent",
            "disabled:bg-slate-50/70 dark:disabled:bg-slate-900/70",
            "disabled:text-slate-500 dark:disabled:text-slate-400",
            "disabled:border-slate-200/70 dark:disabled:border-slate-800/70",
            error ? "border-red-300/85 dark:border-red-700/85 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500/20 dark:focus:ring-red-400/20" : "",
            props.className,
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {description && (
          <p className={clsx(
            "mt-1 text-xs leading-snug transition-colors",
            "text-slate-500 dark:text-slate-400"
          )}>
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
              "rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 text-blue-600 dark:text-blue-400",
              "border-slate-300 dark:border-slate-600",
              "bg-white dark:bg-slate-800",
              "disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed",
              error && "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400",
            )}
            {...props}
          />
          {description && (
            <p className="text-slate-600 dark:text-slate-400 text-xs">{description}</p>
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
          <p className="flex gap-1 pt-2 text-slate-600 dark:text-slate-400 text-xs align-baseline">
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
            "block border-0 shadow-sm py-1.5 rounded-md ring-1 focus:ring-2 ring-inset focus:ring-inset w-full sm:text-sm sm:leading-6",
            "bg-white dark:bg-slate-800",
            "text-slate-900 dark:text-white",
            "ring-slate-300 dark:ring-slate-700",
            "focus:ring-blue-500 dark:focus:ring-blue-400",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            hasError ? "ring-red-300 dark:ring-red-600 focus:ring-red-500 dark:focus:ring-red-400" : "",
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
        <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle
                className="w-5 h-5 text-red-400 dark:text-red-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="text-red-700 dark:text-red-400 text-sm">
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
