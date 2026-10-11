import { useEffect, useMemo, useState } from 'react';
import { INCIDENT_ICONS } from '../../../constants/howItWorksData';

export function useStepScene() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);
  const [iconSeed, setIconSeed] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reducedMotion || activeIndex !== 0) {
      if (reducedMotion) {
        setIconIndex(0);
      }
      return undefined;
    }

    const interval = window.setInterval(() => {
      setIconIndex((previous) => (previous + 1) % INCIDENT_ICONS.length);
      setIconSeed((previous) => previous + 1);
    }, 280);

    return () => window.clearInterval(interval);
  }, [activeIndex, reducedMotion]);

  const currentIcon = INCIDENT_ICONS[iconIndex];
  const restartProgress = () => setProgressKey((previous) => previous + 1);

  return {
    activeIndex,
    setActiveIndex,
    progressKey,
    restartProgress,
    currentIcon,
    iconSeed,
    reducedMotion,
  };
}
