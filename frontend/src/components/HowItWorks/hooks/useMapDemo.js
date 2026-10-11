import { useEffect, useRef, useState } from 'react';
import { MAP_VIEWS } from '../../../constants/howItWorksData';

const toViewBox = (view) => ({
  x: view[0] - view[2] / 2,
  y: view[1] - view[2] * 0.375,
  w: view[2],
  h: view[2] * 0.75,
});

function getTargetPosition(target, base) {
  if (!target || !base) return { x: 0, y: 0 };
  const targetRect = target.getBoundingClientRect();
  const baseRect = base.getBoundingClientRect();

  return {
    x: targetRect.left + targetRect.width / 2 - baseRect.left,
    y: targetRect.top + targetRect.height / 2 - baseRect.top,
  };
}

export function useMapDemo() {
  const demoRef = useRef(null);
  const pinRef = useRef(null);
  const founderRef = useRef(null);
  const arleguiRef = useRef(null);
  const runIdRef = useRef(0);
  const isRunningRef = useRef(false);
  const timeoutIdsRef = useRef(new Map());
  const animationFrameRef = useRef(0);
  const animationResolveRef = useRef(null);
  const currentTargetRef = useRef(null);
  const hasReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initialViewBox = toViewBox(
    hasReducedMotion ? MAP_VIEWS.Casal : MAP_VIEWS.overview,
  );
  const viewBoxRef = useRef(initialViewBox);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [mapVisible, setMapVisible] = useState(hasReducedMotion);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [rippleVisible, setRippleVisible] = useState(false);
  const [caption, setCaption] = useState(
    hasReducedMotion ? 'Tap the pin, then tap a building' : 'Tap the pin',
  );
  const [chipText, setChipText] = useState(
    hasReducedMotion ? "Founder's Building" : '',
  );
  const [selectedBuilding, setSelectedBuilding] = useState(
    hasReducedMotion ? "Founder's Building" : null,
  );
  const [landmark, setLandmark] = useState('Landmark');

  useEffect(() => {
    if (hasReducedMotion) return undefined;

    let mounted = true;

    const updateViewBox = (nextViewBox) => {
      viewBoxRef.current = nextViewBox;
      setViewBox(nextViewBox);
    };

    const resetVisuals = () => {
      if (!mounted) return;
      currentTargetRef.current = null;
      setMapVisible(false);
      setSelectedBuilding(null);
      setChipText('');
      setLandmark('Landmark');
      setCursorVisible(false);
      setRippleVisible(false);
      updateViewBox(toViewBox(MAP_VIEWS.overview));
      setCaption('Tap the pin');
    };

    const clearPendingWork = () => {
      timeoutIdsRef.current.forEach((resolveTimeout, timeoutId) => {
        window.clearTimeout(timeoutId);
        resolveTimeout();
      });
      timeoutIdsRef.current.clear();

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }

      if (animationResolveRef.current) {
        const resolveAnimation = animationResolveRef.current;
        animationResolveRef.current = null;
        resolveAnimation();
      }
    };

    const stop = () => {
      runIdRef.current += 1;
      isRunningRef.current = false;
      clearPendingWork();
      resetVisuals();
    };

    const wait = (delay, id) =>
      new Promise((resolve) => {
        if (!mounted || id !== runIdRef.current) {
          resolve();
          return;
        }

        const timeoutId = window.setTimeout(() => {
          timeoutIdsRef.current.delete(timeoutId);
          resolve();
        }, delay);
        timeoutIdsRef.current.set(timeoutId, resolve);
      });

    const flyTo = (view, duration, id) =>
      new Promise((resolve) => {
        const targetViewBox = toViewBox(view);
        const startViewBox = { ...viewBoxRef.current };
        const startTime = performance.now();
        animationResolveRef.current = resolve;

        const animate = (time) => {
          if (!mounted || id !== runIdRef.current) {
            animationFrameRef.current = 0;
            animationResolveRef.current = null;
            resolve();
            return;
          }

          const progress = Math.min(1, (time - startTime) / duration);
          const eased = 1 - (1 - progress) ** 3;
          updateViewBox({
            x: startViewBox.x + (targetViewBox.x - startViewBox.x) * eased,
            y: startViewBox.y + (targetViewBox.y - startViewBox.y) * eased,
            w: startViewBox.w + (targetViewBox.w - startViewBox.w) * eased,
            h: startViewBox.h + (targetViewBox.h - startViewBox.h) * eased,
          });

          if (progress < 1) {
            animationFrameRef.current = window.requestAnimationFrame(animate);
            return;
          }

          animationFrameRef.current = 0;
          animationResolveRef.current = null;
          resolve();
        };

        animationFrameRef.current = window.requestAnimationFrame(animate);
      });

    const setCursorTarget = (target) => {
      currentTargetRef.current = target;
      setCursorPosition(getTargetPosition(target, demoRef.current));
      setCursorVisible(true);
      setRippleVisible(true);
    };

    const run = async (id) => {
      while (mounted && id === runIdRef.current) {
        resetVisuals();

        await wait(900, id);
        if (id !== runIdRef.current) return;

        setCursorTarget(pinRef.current);
        await wait(1150, id);
        if (id !== runIdRef.current) return;

        setRippleVisible(false);
        setMapVisible(true);
        setCaption('Zoom into Casal');
        await wait(700, id);
        if (id !== runIdRef.current) return;

        await flyTo(MAP_VIEWS.Casal, 1500, id);
        if (id !== runIdRef.current) return;

        setCursorTarget(founderRef.current);
        setCaption('Tap a building');
        await wait(1150, id);
        if (id !== runIdRef.current) return;

        setSelectedBuilding("Founder's Building");
        setChipText("Founder's Building");
        setRippleVisible(false);
        await wait(1400, id);
        if (id !== runIdRef.current) return;

        setChipText('');
        setSelectedBuilding(null);
        setCaption('Pan to Arlegui');
        setCursorVisible(false);
        currentTargetRef.current = null;
        await flyTo(MAP_VIEWS.Arlegui, 1800, id);
        if (id !== runIdRef.current) return;

        setCursorTarget(arleguiRef.current);
        await wait(1150, id);
        if (id !== runIdRef.current) return;

        setSelectedBuilding('Arlegui Campus');
        setChipText('Arlegui Campus');
        setRippleVisible(false);
        await wait(1400, id);
        if (id !== runIdRef.current) return;

        setMapVisible(false);
        setSelectedBuilding(null);
        setChipText('');
        setCursorVisible(false);
        currentTargetRef.current = null;
        setLandmark('Arlegui Campus');
        setCaption('Landmark filled in');
        await wait(2800, id);
        if (id !== runIdRef.current) return;
      }
    };

    const start = () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      const id = ++runIdRef.current;
      void run(id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          start();
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
          stop();
        }
      },
      { threshold: [0, 0.1, 0.3, 0.5, 1] },
    );

    const updateCursorForResize = () => {
      if (currentTargetRef.current && mounted) {
        setCursorPosition(
          getTargetPosition(currentTargetRef.current, demoRef.current),
        );
      }
    };

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateCursorForResize);
      [demoRef.current, pinRef.current, founderRef.current, arleguiRef.current]
        .filter(Boolean)
        .forEach((element) => resizeObserver.observe(element));
    }
    window.addEventListener('resize', updateCursorForResize);

    if (demoRef.current) {
      observer.observe(demoRef.current);
    }

    return () => {
      mounted = false;
      runIdRef.current += 1;
      isRunningRef.current = false;
      clearPendingWork();
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateCursorForResize);
    };
  }, [hasReducedMotion]);

  return {
    demoRef,
    pinRef,
    founderRef,
    arleguiRef,
    mapVisible,
    cursorVisible,
    cursorPosition,
    rippleVisible,
    caption,
    chipText,
    selectedBuilding,
    landmark,
    viewBox,
    hasReducedMotion,
  };
}
