import { useCountUp } from '@/hooks/use-count-up';
import { useInView } from '@/hooks/use-in-view';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
}

/**
 * Component that animates a number from 80% of the target value to the actual value with count-up effect
 * Triggers when the element enters the viewport
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1500,
  className = '',
  prefix = '',
  suffix = '',
  delay = 0,
}: AnimatedNumberProps) {
  const { ref, isInView } = useInView({ triggerOnce: true });

  // Calculate 80% of the final value as the starting point
  const startValue = value * 0.8;

  const count = useCountUp({
    end: isInView ? value : startValue,
    duration,
    decimals,
    delay,
    start: startValue,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
