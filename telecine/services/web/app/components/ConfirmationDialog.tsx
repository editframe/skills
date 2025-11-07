import { Dialog, DialogPanel, DialogTitle, Transition, } from '@headlessui/react';
import { Button } from "./Button";
import { Info } from "@phosphor-icons/react";


export const ConfirmationDialog = ({
  title,
  description,
  mainCtaText,
  secondaryCtaText,
  open,
  setOpen,
  action,
  children,
}: {
  title: string;
  description: string;
  mainCtaText: string;
  secondaryCtaText: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  action: string;
  children: React.ReactNode;
}) => {

  return (
    <Transition.Root show={open} as={"div"}>
    <Dialog
      as="div"
      className="relative z-10 h-screen"
      open={open}
      onClose={() => setOpen(false)}
    >
      <Transition.Child
        as={"div"}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </Transition.Child>

      <form
        action={action}
        className="fixed inset-0 z-10 w-screen overflow-y-auto"
        method="POST"
      >
        {children}
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <Transition.Child
            as={"div"}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel className="relative overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all transform sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Info
                    className="h-6 w-6 text-blue-600"
                    aria-hidden="true"
                    weight="fill"
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
                  mode="primary"
                  type="submit"
                  className="inline-flex w-full justify-center sm:ml-3 sm:w-auto"
                >
                  {mainCtaText}
                </Button>
                <Button
                  mode="secondary"
                  type="button"
                >
                  {secondaryCtaText}
                </Button>
              </div>
            </DialogPanel>
          </Transition.Child>
        </div>
      </form>
    </Dialog>
  </Transition.Root>

  );
};
