export function InnerContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-auto px-4 sm:px-6 lg:px-8 xl:max-w-[90rem]">
      {children}
    </div>
  );
}
