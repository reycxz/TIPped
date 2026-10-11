import { useEffect, useRef, useState } from 'react';

export function useReveal() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.unobserve(element);
      });
    }, { threshold: 0.15 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return {
    ref: sectionRef,
    isVisible,
  };
}
