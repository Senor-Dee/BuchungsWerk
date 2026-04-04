// InfiniteGrid – Canvas-Hintergrund mit Orange-Spotlight
// Liegt über den Blobs (z-index:1), unter allem anderen
import { useEffect, useRef } from 'react';

const CELL   = 58;
const SPOT_R = 280;

export function InfiniteGrid() {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: 600, y: 400, tx: 600, ty: 400 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function onMove(e) {
      const t = e.touches ? e.touches[0] : e;
      mouse.current.tx = t.clientX;
      mouse.current.ty = t.clientY;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const m = mouse.current;

      m.x += (m.tx - m.x) * 0.07;
      m.y += (m.ty - m.y) * 0.07;

      // Orange Spotlight
      const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, SPOT_R);
      grad.addColorStop(0,    'rgba(232,96,10,0.09)');
      grad.addColorStop(0.45, 'rgba(232,96,10,0.03)');
      grad.addColorStop(1,    'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Grid-Linien
      ctx.strokeStyle = 'rgba(240,236,227,0.028)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      for (let x = 0; x < W; x += CELL) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y < H; y += CELL) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      // Glühende Kreuzungspunkte im Spotlight
      for (let x = 0; x < W; x += CELL) {
        for (let y = 0; y < H; y += CELL) {
          const dist = Math.hypot(x - m.x, y - m.y);
          if (dist < SPOT_R) {
            const alpha = Math.pow(1 - dist / SPOT_R, 2) * 0.55;
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = '#e8600a';
            ctx.beginPath();
            ctx.arc(x, y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize',    resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize',    resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none' }}
    />
  );
}
