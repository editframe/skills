import { Fragment, useRef } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Warning } from "@phosphor-icons/react";
import { Button } from "./Button";
import { useNavigate } from "react-router";

export const DeleteDialog = ({
  title,
  description,
  mainCtaText,
  secondaryCtaText,
  open,
  action,
  children,
  navigateOnClose,
}: {
  title: string;
  description: string;
  mainCtaText: string;
  secondaryCtaText: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  action: string;
  children: React.ReactNode;
  navigateOnClose?: string;
}) => {
  const cancelButtonRef = useRef(null);
  const navigate = useNavigate();

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        initialFocus={cancelButtonRef}
        onClose={() => {
          if (navigateOnClose) {
            navigate(navigateOnClose);
          }
        }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <form
          action={action}
          className="fixed inset-0 z-10 w-screen overflow-y-auto"
          method="POST"
        >
          {children}
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all transform sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Warning
                      className="h-6 w-6 text-red-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      {title}
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    mode="destructive"
                    className="inline-flex w-full justify-center sm:ml-3 sm:w-auto"
                    type="submit"
                  >
                    {mainCtaText}
                  </Button>
                  <Button
                    mode="secondary"
                    type="button"
                    onClick={() => {
                      if (navigateOnClose) {
                        navigate(navigateOnClose);
                      }
                    }}
                  >
                    {secondaryCtaText}
                  </Button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </form>
      </Dialog>
    </Transition>
  );
};
