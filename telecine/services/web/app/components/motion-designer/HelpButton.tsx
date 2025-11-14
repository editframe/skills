export function HelpButton() {
  return (
    <button
      className="fixed bottom-4 right-4 w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
      aria-label="Help"
    >
      <span className="text-white text-lg">?</span>
    </button>
  );
}

