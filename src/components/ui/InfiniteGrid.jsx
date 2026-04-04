// InfiniteGrid – Framer-Motion SVG-Grid mit Mouse-Reveal-Maske
// Dim-Layer immer sichtbar, Bright-Layer nur unter Maus sichtbar (radial-gradient Maske)
// Orange Blobs + animiert scrollendes Grid-Pattern
import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from 'framer-motion';

const CELL = 58;       // Rastergröße px (wie vorher)
const SPEED = 0.5;     // px/Frame

// SVG-Grid-Pattern – animierter offset via framer-motion
function GridPattern({ offsetX, offsetY, color, opacity }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <motion.pattern
          id={`gp-${color.replace('#','').replace('(','').replace(',','')}`}
          width={CELL}
          height={CELL}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${CELL} 0 L 0 0 0 ${CELL}`}
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </motion.pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill={`url(#gp-${color.replace('#','').replace('(','').replace(',','')})`}
        opacity={opacity}
      />
    </svg>
  );
}

export function InfiniteGrid() {
  const containerRef = useRef(null);

  // Maus-Position für Maske
  const mouseX = useMotionValue(600);
  const mouseY = useMotionValue(400);

  // Scroll-Offset
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  // Mask-Template: Bright-Layer nur im 320px-Radius sichtbar
  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`;

  // Animiertes Scrollen
  useAnimationFrame(() => {
    offsetX.set((offsetX.get() + SPEED) % CELL);
    offsetY.set((offsetY.get() + SPEED) % CELL);
  });

  function handleMouseMove(e) {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Orange Blobs – unverändert */}
      <div style={{
        position: 'absolute',
        right: '-15%', top: '-20%',
        width: '38%', height: '38%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,96,10,0.18) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: '-10%', bottom: '-15%',
        width: '32%', height: '32%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,96,10,0.10) 0%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
      }} />

      {/* Dim-Layer – immer sichtbar, sehr subtil */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <GridPattern
          offsetX={offsetX}
          offsetY={offsetY}
          color="#f0ece3"
          opacity={1}
        />
      </div>

      {/* Bright-Layer – sichtbar nur unter Maus-Cursor */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.55,
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        <GridPattern
          offsetX={offsetX}
          offsetY={offsetY}
          color="#e8600a"
          opacity={1}
        />
      </motion.div>
    </div>
  );
}
