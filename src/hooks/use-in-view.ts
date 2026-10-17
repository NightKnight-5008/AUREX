import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Only trigger once when element enters viewport (default: true) */
  triggerOnce?: boolean;
  /** Root margin for the intersection observer (default: '0px') */
  rootMargin?: string;
  /** Threshold for triggering (default: 0.1) */
  threshold?: number;
}

/**
 * Hook that detects when an element enters the viewport
 * Useful for triggering animations when elements become visible
 */
export function useInView({
  triggerOnce = true,
  rootMargin = '0px',
  threshold = 0.1,
}: UseInViewOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);

        // If triggerOnce is true, disconnect observer after first intersection
        if (inView && triggerOnce) {
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [triggerOnce, rootMargin, threshold]);

  return { ref, isInView };
}
