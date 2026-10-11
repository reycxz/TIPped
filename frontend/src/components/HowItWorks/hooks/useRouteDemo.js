import { useCallback, useEffect, useRef, useState } from 'react';
import { OFFICES } from '../../../constants/howItWorksData';

export function useRouteDemo() {
  const [selectedIndex, setSelectedIndexState] = useState(0);
  const [dot, setDot] = useState(null);
  const [lineAnimation, setLineAnimation] = useState(null);
  const pathRefs = useRef([]);
  const animationFrameRef = useRef(0);
  const animationIdRef = useRef(0);
  const mountedRef = useRef(false);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setSelectedIndex = useCallback(
    (index) => {
      const safeIndex = Math.max(0, Math.min(index, OFFICES.length - 1));
      setSelectedIndexState(safeIndex);
      animationIdRef.current += 1;

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }

      setLineAnimation(null);
      setDot(null);
      if (reducedMotion) return;

      const path = pathRefs.current[safeIndex];
      if (!path) return;

      const currentAnimationId = animationIdRef.current;
      const length = path.getTotalLength();
      const startPoint = path.getPointAtLength(0);
      const startTime = performance.now();
      setDot({ x: startPoint.x, y: startPoint.y });

      const animate = (timestamp) => {
        if (!mountedRef.current || currentAnimationId !== animationIdRef.current) {
          return;
        }

        const progress = Math.min(1, (timestamp - startTime) / 800);
        const eased = 1 - (1 - progress) ** 3;
        const point = path.getPointAtLength(length * eased);
        setDot({ x: point.x, y: point.y });

        if (progress < 1) {
          setLineAnimation({ index: safeIndex, length, progress });
          animationFrameRef.current = window.requestAnimationFrame(animate);
          return;
        }

        animationFrameRef.current = 0;
        setLineAnimation(null);
        setDot(null);
      };

      setLineAnimation({ index: safeIndex, length, progress: 0 });
      animationFrameRef.current = window.requestAnimationFrame(animate);
    },
    [reducedMotion],
  );

  useEffect(() => {
    mountedRef.current = true;
    let initialAnimationFrame = 0;
    if (!reducedMotion) {
      initialAnimationFrame = window.requestAnimationFrame(() => {
        setSelectedIndex(0);
      });
    }

    return () => {
      mountedRef.current = false;
      animationIdRef.current += 1;
      if (initialAnimationFrame) {
        window.cancelAnimationFrame(initialAnimationFrame);
      }
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [reducedMotion, setSelectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    dot,
    lineAnimation,
    pathRefs,
    reducedMotion,
  };
}
