import { useRef, useEffect, useState, type ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  rootMargin?: string;
}

export function LazySection({ children, rootMargin = "200px" }: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.unobserve(el);
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {shouldRender ? children : null}
    </div>
  );
}
