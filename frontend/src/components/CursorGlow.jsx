import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const GLOW_RADIUS = 380;
const GLOW_OPACITY = 0.06;

export default function CursorGlow() {
  const layerRef = useRef(null);
  const frameRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  const canShowGlow =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!canShowGlow) {
      return undefined;
    }

    const layer = layerRef.current;
    if (!layer) {
      return undefined;
    }

    const setGlowPosition = (x, y) => {
      layer.style.setProperty('--glow-x', `${x}px`);
      layer.style.setProperty('--glow-y', `${y}px`);
    };

    const handlePointerMove = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const { x, y } = pointerRef.current;
        setGlowPosition(x, y);
        layer.style.opacity = '1';
        frameRef.current = null;
      });
    };

    const handlePointerLeave = () => {
      layer.style.opacity = '0';
    };

    layer.style.opacity = '0';
    setGlowPosition(pointerRef.current.x, pointerRef.current.y);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [canShowGlow]);

  if (!canShowGlow || !document.body) {
    return null;
  }

  return createPortal(
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9000] mix-blend-screen hidden opacity-0 transition-opacity duration-300 ease-out dark:block"
      style={{
        background: `radial-gradient(circle ${GLOW_RADIUS}px at var(--glow-x, -9999px) var(--glow-y, -9999px), rgba(245,158,11,${GLOW_OPACITY}) 0%, rgba(245,158,11,${GLOW_OPACITY * 0.55}) 35%, rgba(245,158,11,${GLOW_OPACITY * 0.15}) 70%, rgba(245,158,11,0) 100%)`,
      }}
    />,
    document.body
  );
}
