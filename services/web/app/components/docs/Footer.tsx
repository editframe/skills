export function Footer() {
  return (
    <div className="flex g:px-[5.5rem] max-w-6xl mx-auto w-full justify-between gap-4  py-4 text-sm text-gray-400 dark:border-gray-800">
      <div className="sm:flex sm:items-center sm:gap-2">
        <div>
          &copy;{" "}
          <a className="hover:underline" href="https://editframe.com">
            Editframe Inc.
          </a>
        </div>
        <div className="hidden sm:block">•</div>
        {new Date().getFullYear()}
      </div>
    </div>
  );
}
