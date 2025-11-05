import { Outlet } from "react-router";
import type { MetaFunction } from "react-router";
import { Header } from "~/components/marketing/Header";
import { Footer } from "~/components/Footer";
import "~/styles/docs.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Tools | Editframe" },
    {
      name: "description",
      content: "Tools for using Editframe",
    },
  ];
};

export default function GuideLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-editframe-900 dark:text-gray-200 antialiased selection:bg-blue-200 selection:text-black dark:selection:bg-blue-800 dark:selection:text-white">
      <Header />
      <main>
        <div className="lg:px-[7.2rem] mx-auto">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}