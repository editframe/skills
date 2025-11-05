import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface FlashMessageProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

export function FlashMessage({ message, type, onDismiss }: FlashMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Allow time for fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={clsx(
        'fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
        type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      )}
    >
      {message}
    </div>
  );
} 