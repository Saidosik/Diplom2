'use client';

import { useEffect, useMemo, useRef } from 'react';

export interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
  className?: string;
}

export default function Aurora({
  colorStops = ['#5227FF', '#7cff67', '#5227FF'],
  amplitude = 1.0,
  blend = 0.5,
  time,
  speed = 1,
  className = '',
}: AuroraProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const gradient = useMemo(() => {
    const [start, middle, end] = colorStops;
    return `radial-gradient(circle at 18% 22%, ${start} 0%, transparent 34%), radial-gradient(circle at 58% 8%, ${middle} 0%, transparent 38%), radial-gradient(circle at 82% 28%, ${end} 0%, transparent 32%), linear-gradient(110deg, ${start}, ${middle}, ${end})`;
  }, [colorStops]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    let animationFrame = 0;
    const startedAt = performance.now();

    const animate = (frameTime: number) => {
      const elapsed = typeof time === 'number' ? time : (frameTime - startedAt) / 1000;
      const offset = Math.sin(elapsed * speed * 0.45) * 18 * amplitude;
      const vertical = Math.cos(elapsed * speed * 0.35) * 10 * amplitude;

      element.style.transform = `translate3d(${offset}px, ${vertical}px, 0) scale(${1 + amplitude * 0.04})`;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [amplitude, speed, time]);

  return (
    <div
      ref={rootRef}
      className={`h-full w-full ${className}`}
      style={{
        background: gradient,
        filter: `blur(${Math.max(36, blend * 90)}px) saturate(1.08)`,
        opacity: 0.55,
      }}
      aria-hidden="true"
    />
  );
}
