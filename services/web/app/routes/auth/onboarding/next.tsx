import { formFor } from "~/formFor";
import z from "zod";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { Fragment, useState } from "react";
import { data, Link, type MetaFunction } from "react-router";
import { redirect } from "react-router";
import { graphql } from "@/graphql";
import * as serverGQL from "@/graphql.server";
import { requireSession } from "@/util/requireSession.server";

import type { Route } from "./+types/next";

export const meta: MetaFunction = () => {
  return [{ title: "Welcome | Editframe" }];
};

const schema = z.object({
  channel: z.string().optional(),
  use_case: z.string().optional(),
});
const onboarding = formFor(schema);

export const action = async ({ request }: Route.ActionArgs) => {
  const { session } = await requireSession(request);

  const formResult = await onboarding.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  const onboardingData = formResult.data;
  const { channel, use_case } = onboardingData;
  const updateUser = await serverGQL.mutateAs(
    session!,
    "user",
    graphql(`
      mutation UpdateUser($id: uuid!, $metadata: jsonb) {
        update_users_by_pk(
          _set: { metadata: $metadata }
          pk_columns: { id: $id }
        ) {
          id
        }
      }
    `),
    {
      id: session?.uid,
      metadata: {
        onboarding: {
          channel,
          use_case,
        },
      },
    },
  );

  if (!updateUser.data) {
    return data({ formErrors: ["Failed to update user"] }, { status: 500 });
  }

  return redirect("/welcome");
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireSession(request);
  return null;
};

export default function Page() {
  const channels = [
    { id: "google", name: "Search Engine (Google)" },
    { id: "recommendation", name: "Recommendation" },
    { id: "newsletter", name: "Email Newsletter" },
    { id: "videoTutorials", name: "Video Tutorials" },
    { id: "apiDocs", name: "API Documentation" },
    { id: "blog", name: "Blog" },
    { id: "socialMedia", name: "Social Media" },
    { id: "other", name: "Other" },
  ];

  const useCases = [
    { id: "personal", title: "Personal Use" },
    { id: "enterprise", title: "Enterprise Solutions" },
    { id: "education", title: "Educational Content Creation" },
    { id: "marketing", title: "Marketing and Social Media" },
    { id: "content-creators", title: "Content Creators and Influencers" },
    { id: "events", title: "Event Highlights" },
    { id: "testimonials", title: "Customer Testimonials" },
    { id: "real-estate", title: "Real Estate" },
    { id: "product-demos", title: "Product Demonstrations" },
  ];
  const [selectedChannel, setSelectedChannel] = useState(channels[0]);
  const [selectedUseCase, setSelectedUseCase] = useState(useCases[0]?.id);

  return (
    <div className="container mt-10 py-4 sm:mx-auto sm:w-full sm:max-w-sm">
      <div className="mx-auto max-w-2xl text-center">
        <svg
          className="mx-auto my-4 h-12 w-12 md:my-0"
          viewBox="0 0 512 512"
          width="36"
          height="36"
        >
          <path
            d="M144 48v272a48 48 0 0048 48h272"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
          <path
            d="M368 304V192a48 48 0 00-48-48H208M368 368v96M144 144H48"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
        </svg>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Welcome to Editframe! We're excited to hear from you.
        </p>
      </div>
      <onboarding.Form className="mt-8 grid max-w-full grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <onboarding.Input
          field="channel"
          type="hidden"
          value={selectedChannel ? selectedChannel.id : ""}
        />
        <onboarding.Input
          field="use_case"
          type="hidden"
          value={selectedUseCase || ""}
        />
        <div className="sm:col-span-2">
          <label className="my-2 text-base font-semibold text-gray-900">
            What do you want to achieve with Editframe?
          </label>
          <p className="mt-2 text-sm text-gray-500">Select all that apply.</p>
          <fieldset className="mt-4">
            <legend className="sr-only">Notification method</legend>
            <div className="space-y-4">
              {useCases.map((useCase) => (
                <div key={useCase.id} className="flex items-center">
                  <input
                    id={useCase.id}
                    name="notification-method"
                    type="radio"
                    className="h-4 w-4 border-gray-300 text-editframe-600 focus:ring-editframe-600"
                    onChange={() => setSelectedUseCase(useCase.id)}
                    checked={selectedUseCase === useCase.id}
                  />
                  <label
                    htmlFor={useCase.id}
                    className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                  >
                    {useCase.title}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="sm:col-span-2">
          <Listbox value={selectedChannel} onChange={setSelectedChannel}>
            {({ open }) => (
              <>
                <Listbox.Label className="block text-sm font-medium leading-6 text-gray-900">
                  How did you hear about us?
                </Listbox.Label>
                <div className="relative mt-2">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-editframe-600 sm:text-sm sm:leading-6">
                    <span className="block truncate">
                      {selectedChannel?.name}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>

                  <Transition
                    show={open}
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {channels.map((channel) => (
                        <Listbox.Option
                          key={channel.id}
                          className={({ active }) =>
                            classNames(
                              active
                                ? "bg-editframe-600 text-white"
                                : "text-gray-900",
                              "relative cursor-default select-none py-2 pl-3 pr-9",
                            )
                          }
                          value={channel}
                        >
                          {({ selectedOption, selected }) => (
                            <>
                              <span
                                className={classNames(
                                  selected ? "font-semibold" : "font-normal",
                                  "block truncate",
                                )}
                              >
                                {channel.name}
                              </span>

                              {selectedOption && (
                                <span
                                  className={classNames(
                                    selected
                                      ? "text-white"
                                      : "text-editframe-600",
                                    "absolute inset-y-0 right-0 flex items-center pr-4",
                                  )}
                                >
                                  <CheckIcon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </>
            )}
          </Listbox>
        </div>

        {selectedChannel && selectedChannel.id === "other" && (
          <div className="sm:col-span-2">
            <onboarding.Field label="Please specify the channel">
              <onboarding.FieldError field="channel" />
              <onboarding.Input
                field="channel"
                type="text"
                name="channel"
                id="channel"
                autoComplete="off"
                aria-label="Other channel"
                className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-editframe-600 sm:text-sm sm:leading-6"
              />
            </onboarding.Field>
          </div>
        )}
        <div className="mt-10 flex flex-col justify-center sm:col-span-2">
          <button
            type="submit"
            className="block w-full rounded-md bg-editframe-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-editframe-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-editframe-600"
          >
            Finish setup
          </button>
          <Link
            to="/welcome"
            className="mt-2 block w-full rounded-md  px-3.5 py-2.5 text-center text-sm text-gray-900 underline "
          >
            Skip for now
          </Link>
        </div>
      </onboarding.Form>
    </div>
  );
}
