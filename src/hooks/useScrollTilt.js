// useScrollTilt – Kippt eine Karte beim Scrollen in 3D
import { useEffect, useRef } from 'react';

export function useScrollTilt() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      const rect     = el.getBoundingClientRect();
      const vh       = window.innerHeight;
      const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));
      const tilt     = (0.5 - progress) * 16;
      const scale    = 0.93 + progress * 0.07;
      const blurVal  = (1 - progress) * 4;
      const opacity  = 0.4 + progress * 0.6;

      el.style.transform = `rotateX(${tilt}deg) scale(${scale})`;
      el.style.opacity   = opacity;
      el.style.filter    = blurVal > 0.2 ? `blur(${blurVal}px)` : '';
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  return ref;
}
