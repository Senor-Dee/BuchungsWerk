// use3DTilt – Maus-Tilt für Karten (z.B. KI-Demo-Card)
import { useRef } from 'react';

export function use3DTilt() {
  const ref = useRef(null);

  function onMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    el.style.transform  = `rotateY(${dx * 9}deg) rotateX(${-dy * 5}deg)`;
    el.style.boxShadow  = `${-dx * 20}px ${dy * 20}px 50px rgba(0,0,0,0.4), 0 0 40px rgba(232,96,10,0.12)`;
    el.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform  = '';
    el.style.boxShadow  = '';
    el.style.transition = 'transform 0.6s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease';
  }

  return { ref, onMouseMove, onMouseLeave };
}
