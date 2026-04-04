// InfiniteGrid – framer-motion SVG-Grid mit Mouse-Reveal-Maske
// Fixes:
//   1. window.addEventListener für Maus (pointerEvents:none blockiert onMouseMove)
//   2. Pattern-x/y direkt via ref.setAttribute statt motion.pattern (SVG-Compat)
import { useRef, useEffect } from 'react';
import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from 'framer-motion';


const CELL = 40;
const SPEED = 0.5;

export function InfiniteGrid() {
  const patDimRef    = useRef(null);
  const patBrightRef = useRef(null);
  const containerRef = useRef(null);

  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 600);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 400);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  // Maus-Tracking via window – funktioniert trotz pointerEvents:none
  useEffect(() => {
    function onMove(e) {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  // Scroll-Fade: Grid nur im Hero (oberstes Viewport-Drittel) sichtbar
  useEffect(() => {
    function onScroll() {
      if (!containerRef.current) return;
      const fadeEnd = window.innerHeight * 0.65;
      const opacity = Math.max(0, 1 - window.scrollY / fadeEnd);
      containerRef.current.style.opacity = opacity;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Grid-Scroll: direkt per setAttribute (kein Re-Render, maximale Performance)
  useAnimationFrame(() => {
    const x = (offsetX.get() + SPEED) % CELL;
    const y = (offsetY.get() + SPEED) % CELL;
    offsetX.set(x);
    offsetY.set(y);
    patDimRef.current?.setAttribute('x', x);
    patDimRef.current?.setAttribute('y', y);
    patBrightRef.current?.setAttribute('x', x);
    patBrightRef.current?.setAttribute('y', y);
  });

  // Mask: radial-gradient folgt Cursor — only bright layer sichtbar
  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`;

  return (
    <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* Orange Blobs */}
      <div style={{
        position: 'absolute', right: '-15%', top: '-20%',
        width: '38%', height: '38%', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,96,10,0.18) 0%, transparent 70%)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', left: '-10%', bottom: '-15%',
        width: '32%', height: '32%', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,96,10,0.10) 0%, transparent 70%)',
        filter: 'blur(100px)',
      }} />

      {/* Dim-Layer – immer sichtbar, sehr subtil (Bone) */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.045 }}>
        <svg style={{ width: '100%', height: '100%' }}>
          <defs>
            <pattern ref={patDimRef} id="gp-dim" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
              <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#f0ece3" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gp-dim)"/>
        </svg>
      </div>

      {/* Bright-Layer – sichtbar nur unter Cursor (Orange) */}
      <motion.div style={{
        position: 'absolute', inset: 0, opacity: 0.45,
        maskImage, WebkitMaskImage: maskImage,
      }}>
        <svg style={{ width: '100%', height: '100%' }}>
          <defs>
            <pattern ref={patBrightRef} id="gp-bright" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
              <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#e8600a" strokeWidth="0.75"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gp-bright)"/>
        </svg>
      </motion.div>

    </div>
  );
}
