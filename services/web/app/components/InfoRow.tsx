interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  vertical?: boolean;
  noHighlight?: boolean;
}

export function InfoRow({
  label,
  value,
  className = "",
  vertical = false,
  noHighlight = false
}: InfoRowProps) {
  return (
    <div className={`border-b border-gray-300 last:border-b-0 py-2 ${noHighlight === true ? '' : 'hover:bg-gray-50'} ${className}`}>
      <div className={`${vertical ? 'flex flex-col gap-1' : 'flex'}`}>
        <span className={`text-xs font-medium text-gray-600 ${vertical ? '' : 'w-1/3 lg:w-1/4 xl:w-1/5'}`}>
          {label}
        </span>
        <span className={`text-xs font-light ${vertical ? 'pl-4' : 'w-2/3 lg:w-3/4 xl:w-4/5'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
