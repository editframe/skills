import { useState, useEffect } from "react";
import type { Session } from "react-router";

export type ExtractedFlash = {
  errorMessage: string | undefined;
  successMessage: string | undefined;
};

export function extractNewFlash(sessionCookie: Session): ExtractedFlash {
  const errorMessage = sessionCookie.get("error") as string | undefined;
  const successMessage = sessionCookie.get("success") as string | undefined;
  sessionCookie.unset("error");
  sessionCookie.unset("success");

  return {
    errorMessage,
    successMessage,
  };
}

export function useFlashMessages({ errorMessage, successMessage }: NewFlash) {
  const [flashMessages, setFlashMessages] = useState<AnyFlashMessage[]>([]);

  useEffect(() => {
    const newMessages: AnyFlashMessage[] = [];

    if (errorMessage) {
      const id = `error-${Date.now()}`;
      newMessages.push({
        id,
        message: errorMessage,
        type: "error",
        dismiss: () => {
          setFlashMessages((prev) => prev.filter((msg) => msg.id !== id));
        },
      });
    }

    if (successMessage) {
      const id = `success-${Date.now()}`;
      newMessages.push({
        id,
        message: successMessage,
        type: "success",
        dismiss: () => {
          setFlashMessages((prev) => prev.filter((msg) => msg.id !== id));
        },
      });
    }

    setFlashMessages(newMessages);
  }, [errorMessage, successMessage]);

  return flashMessages;
}
interface SuccessFlashMessage {
  id: string;
  message: string;
  type: "success";
  dismiss: () => void;
}
interface ErrorFlashMessage {
  id: string;
  message: string;
  type: "error";
  dismiss: () => void;
}

export type AnyFlashMessage = SuccessFlashMessage | ErrorFlashMessage;

export interface NewFlash {
  errorMessage?: string;
  successMessage?: string;
}
