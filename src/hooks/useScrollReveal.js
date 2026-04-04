// useScrollReveal – Element faded/slided beim Scrollen rein
import { useEffect, useRef } from 'react';

export function useScrollReveal(delay = 0) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity    = '0';
    el.style.transform  = 'translateY(36px)';
    el.style.transition = [
      `opacity 0.85s ${delay}ms cubic-bezier(0.23,1,0.32,1)`,
      `transform 0.85s ${delay}ms cubic-bezier(0.23,1,0.32,1)`,
    ].join(', ');

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity   = '1';
          el.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return ref;
}
