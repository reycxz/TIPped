import { useEffect, useState } from 'react';

export function useHeroOutOfView(enabled) {
  const [isHeroOutOfView, setIsHeroOutOfView] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const hero = document.querySelector('main');
    if (!hero) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setIsHeroOutOfView(!entry.isIntersecting);
    });

    observer.observe(hero);
    return () => observer.disconnect();
  }, [enabled]);

  return isHeroOutOfView;
}
