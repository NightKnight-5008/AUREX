import { useEffect, useState } from 'react';
import { useAnimation } from '@/contexts/animation-context';

interface UseCountUpOptions {
  /** The final value to count up to */
  end: number;
  /** Duration of the animation in milliseconds (default: 1500) */
  duration?: number;
  /** Number of decimal places to show (default: 0) */
  decimals?: number;
  /** Start value (default: 0) */
  start?: number;
  /** Delay before starting the animation in milliseconds (default: 0) */
  delay?: number;
  /** Easing function type (default: 'easeOutExpo') */
  easing?: 'linear' | 'easeOutExpo' | 'easeInOutQuad';
}

/**
 * Hook that provides a count-up animation from a start value to an end value
 * Perfect for animating numeric values in dashboards and metrics displays
 *
 * Note: When used with AnimatedNumber component, animations start from 80% of the final value
 * to create a more subtle and modern animation effect
 *
 * Animations only trigger once per app session (on initial load/reload),
 * not when navigating between pages.
 */
export function useCountUp({
  end,
  duration = 1500,
  decimals = 0,
  start = 0,
  delay = 0,
  easing = 'easeOutExpo',
}: UseCountUpOptions): number {
  const { hasAnimated, markAsAnimated } = useAnimation();
  const [count, setCount] = useState(hasAnimated ? end : start);

  useEffect(() => {
    // If animations have already played, just set the final value immediately
    if (hasAnimated) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    // Easing functions
    const easingFunctions = {
      linear: (t: number) => t,
      easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    };

    const easingFn = easingFunctions[easing];

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Apply easing
      const easedProgress = easingFn(progress);

      // Calculate current value
      const currentCount = start + (end - start) * easedProgress;

      setCount(Number(currentCount.toFixed(decimals)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Mark animations as completed when done
        markAsAnimated();
      }
    };

    // Start animation after delay
    const timeoutId = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, decimals, start, delay, easing, hasAnimated, markAsAnimated]);

  return count;
}
