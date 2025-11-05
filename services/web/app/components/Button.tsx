import type React from "react";
import type { ButtonHTMLAttributes } from "react";
import {
  ArrowRightIcon,
  BoltIcon,
  HandThumbDownIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType } from "react";
import clsx from "clsx";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Button as HeadlessButton,
} from "@headlessui/react";
import { useState, useRef, useEffect, forwardRef } from "react";
import { formFor } from "../formFor";
import { z } from "zod";
import type { FetcherWithComponents } from "react-router";

const baseStyles =
  "inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs";

const buttonStyles = {
  primary: {
    base: baseStyles,
    variant:
      "font-medium text-gray-600 fill-gray-400 bg-gray-200 shadow-sm hover:bg-gray-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:ring-gray-100",
    icon: "size-4 fill-inherit",
  },
  secondary: {
    base: baseStyles,
    variant:
      "font-medium text-gray-500 fill-gray-400 bg-gray-100 shadow-sm hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:ring-gray-50",
    icon: "size-4 fill-inherit",
  },
  action: {
    base: baseStyles,
    variant:
      "font-medium text-purple-600 fill-purple-400 bg-purple-200 shadow-sm hover:bg-purple-300 disabled:cursor-not-allowed disabled:bg-purple-100 disabled:ring-purple-100",
    icon: "size-4 fill-inherit",
  },
  creative: {
    base: baseStyles,
    variant:
      "font-medium text-mantis-800 fill-mantis-500 bg-mantis-200 shadow-sm hover:bg-mantis-300 disabled:cursor-not-allowed disabled:bg-mantis-100 disabled:ring-mantis-100",
    icon: "size-4 fill-inherit",
  },
  destructive: {
    base: baseStyles,
    variant:
      "font-medium text-red-600 fill-red-300 bg-red-200 shadow-sm hover:bg-red-300 disabled:cursor-not-allowed disabled:bg-red-100 disabled:ring-red-100",
    icon: "size-4 fill-inherit",
  },
};

type ConfirmationInputConfig = {
  type: "select" | "input" | "checkbox" | "textarea";
  name: string;
  label: string;
  description?: string;
  defaultValue?: string;
  schema: z.ZodType<any>;
  // For select inputs
  options?: Array<{
    value: string;
    label: string;
    selected?: boolean;
  }>;
  // For text/number inputs
  inputType?: string;
};

type ConfirmationProps = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  challengeText?: string;
  inputs?: ConfirmationInputConfig[];
};

type ButtonProps = {
  mode: "primary" | "creative" | "secondary" | "destructive" | "action";
  className?: string;
  children?: React.ReactNode;
  loading?: boolean;
  icon?: ComponentType<{ className?: string }>;
  confirmation?: ConfirmationProps;
  onConfirm?: (values?: Record<string, any>) => void;
  action?: {
    fetcher: FetcherWithComponents<{ success: boolean }>;
    method: "POST" | "GET";
    url: string;
  };
} & ButtonHTMLAttributes<HTMLButtonElement>;

const defaultIcons = {
  primary: ArrowRightIcon,
  secondary: PlusIcon,
  destructive: XCircleIcon,
  action: BoltIcon,
  creative: PlusIcon,
};

const createInputSchema = (inputs?: ConfirmationInputConfig[]) => {
  if (!inputs?.length) return z.object({});

  const shape: Record<string, z.ZodType<any>> = {};
  for (const input of inputs) {
    shape[input.name] = input.schema;
  }

  return z.object(shape);
};

const LoadingSpinner = () => (
  <svg
    className="animate-spin size-4 text-current"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const ConfirmationForm = ({
  inputs,
  onSubmit,
  onClose,
  mode,
  Icon,
  confirmText,
  cancelText,
  children,
  isDisabled,
}: {
  inputs?: ConfirmationInputConfig[];
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  mode: ButtonProps["mode"];
  Icon?: ComponentType<{ className?: string }>;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
}) => {
  const schema = createInputSchema(inputs);
  const { Form, Input, Select, Checkbox, TextArea } = formFor(schema);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
    onClose();
  };

  return (
    <Form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      {inputs?.map((input) => {
        switch (input.type) {
          case "select":
            return (
              <Select
                key={input.name}
                field={input.name as keyof z.infer<typeof schema>}
                label={input.label}
                description={input.description}
                options={input.options ?? []}
                defaultValue={input.defaultValue}
              />
            );
          case "checkbox":
            return (
              <Checkbox
                key={input.name}
                field={input.name as keyof z.infer<typeof schema>}
                label={input.label}
                description={input.description}
              />
            );
          case "textarea":
            return (
              <TextArea
                key={input.name}
                field={input.name as keyof z.infer<typeof schema>}
                label={input.label}
              />
            );
          default:
            return (
              <Input
                key={input.name}
                field={input.name as keyof z.infer<typeof schema>}
                type={input.inputType}
                label={input.label}
                description={input.description}
                defaultValue={input.defaultValue}
              />
            );
        }
      })}

      <div className="mt-4 flex justify-end gap-2">
        <HeadlessButton
          type="button"
          onClick={onClose}
          className={clsx(
            buttonStyles.secondary.base,
            buttonStyles.secondary.variant,
          )}
        >
          <HandThumbDownIcon className={buttonStyles.secondary.icon} />
          {cancelText || "Cancel"}
        </HeadlessButton>
        <Button mode={mode} icon={Icon} type="submit" disabled={isDisabled}>
          {confirmText || children}
        </Button>
      </div>
    </Form>
  );
};

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  inputs,
  challengeText,
  confirmText,
  cancelText,
  mode,
  icon: Icon,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (formData: FormData) => void;
} & ConfirmationProps & {
    mode: ButtonProps["mode"];
    icon?: ComponentType<{ className?: string }>;
    children?: React.ReactNode;
  }) => {
  const [challengeInput, setChallengeInput] = useState("");
  const challengeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setChallengeInput("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && challengeText) {
      setTimeout(() => challengeInputRef.current?.focus(), 0);
    }
  }, [isOpen, challengeText]);

  const canSubmit = !challengeText || challengeInput === challengeText;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded bg-white p-6 shadow-xl">
          <DialogTitle className="text-sm font-medium">{title}</DialogTitle>
          <p className="mt-2 text-xs">{description}</p>

          {challengeText && (
            <div className="mt-4">
              <label
                htmlFor="challenge-input"
                className="text-xs text-gray-600"
              >
                Type{" "}
                <span className="bg-gray-100 font-mono px-1 rounded">
                  {challengeText}
                </span>{" "}
                to confirm
              </label>
              <input
                id="challenge-input"
                ref={challengeInputRef}
                type="text"
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1 text-xs"
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) {
                    e.preventDefault();
                    onConfirm(new FormData());
                  }
                }}
              />
            </div>
          )}

          <ConfirmationForm
            inputs={inputs}
            onSubmit={onConfirm}
            onClose={onClose}
            mode={mode}
            Icon={Icon}
            confirmText={confirmText}
            cancelText={cancelText}
            children={children}
            isDisabled={!canSubmit}
          />
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      mode,
      className,
      children,
      loading,
      icon: IconComponent,
      confirmation,
      onConfirm,
      onClick,
      action,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isHydrated, setIsHydrated] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const Icon = IconComponent || defaultIcons[mode];

    // Prevent button interactions during hydration to avoid
    // race conditions between server and client handlers
    useEffect(() => {
      setIsHydrated(true);
    }, []);

    const handleClose = () => {
      setIsConfirmOpen(false);
    };

    useEffect(() => {
      if (action?.fetcher.data?.success === true) {
        handleClose();
      }
    }, [action?.fetcher.data]);

    const handleAction = (formData?: FormData) => {
      const values = formData ? Object.fromEntries(formData.entries()) : {};

      if (action) {
        action.fetcher.submit(values as any, {
          method: action.method,
          action: action.url,
          encType: "application/json",
        });
      } else {
        onConfirm?.(values);
      }
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (confirmation && (!event.shiftKey || confirmation.challengeText)) {
        event.preventDefault();
        setIsConfirmOpen(true);
      } else {
        handleAction();
      }
    };

    return (
      <>
        <HeadlessButton
          className={clsx(
            buttonStyles[mode].base,
            buttonStyles[mode].variant,
            className,
            {
              "cursor-not-allowed": loading || !isHydrated,
            },
          )}
          onClick={handleClick}
          disabled={disabled || !isHydrated}
          {...props}
          ref={ref}
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            Icon && <Icon className={buttonStyles[mode].icon} />
          )}
          {children}
        </HeadlessButton>

        {confirmation && isConfirmOpen && (
          <ConfirmationDialog
            {...confirmation}
            isOpen={isConfirmOpen}
            onClose={handleClose}
            onConfirm={handleAction}
            mode={mode}
            icon={Icon}
            children={children}
          />
        )}
      </>
    );
  },
);

Button.displayName = "Button";
