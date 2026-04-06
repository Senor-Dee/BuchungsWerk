// BwTypeCarousel – 3D Zylinder-Karussell, Vogelperspektive
// Interaction: Maus-Drag + Touch-Drag + Direktklick auf jede Karte
// Kein Auto-Rotate, kein Wheel (kein Scroll-Konflikt)
import { useRef, useEffect, useState } from 'react';
import { PenLine, ClipboardList, Factory, ReceiptEuro } from 'lucide-react';

const ITEMS = [
  {
    id: 'Übung',
    icon: PenLine,
    label: 'Übung',
    sub: 'Aufgaben üben',
    desc: 'Buchungsaufgaben nach Klasse & Lernbereich',
  },
  {
    id: 'Prüfung',
    icon: ClipboardList,
    label: 'Prüfung',
    sub: 'Schulaufgabe',
    desc: 'Bewertete Prüfung mit Punkteschema',
  },
  {
    id: 'Simulation',
    icon: Factory,
    label: 'Simulation',
    sub: 'Firma führen',
    desc: 'Vollständige Buchführungssimulation',
  },
  {
    id: 'Beleg-Editor',
    icon: ReceiptEuro,
    label: 'Beleg-Editor',
    sub: 'Belege gestalten',
    desc: 'Belege erstellen & exportieren',
  },
];

const N      = ITEMS.length; // 4
const ANGLE  = 360 / N;      // 90°
const RADIUS = 220;          // px Tiefe
const TILT   = 22;           // deg rotateX – zeigt Back-Card von oben

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

export function BwTypeCarousel({ onSelect, selectedId }) {
  const containerRef = useRef(null);
  const innerRef     = useRef(null);
  const cardRefs     = useRef([]);
  const rotRef       = useRef(0);
  const isSnapRef    = useRef(false);
  const dragRef      = useRef(null); // { x, startRot, moved }
  const frontIdxRef  = useRef(0);
  const [frontIdx, _setFrontIdx] = useState(0);

  const setFrontIdx = (i) => { frontIdxRef.current = i; _setFrontIdx(i); };

  // ── DOM-Rotation + Opacity ──────────────────────────────────────────────────
  const applyRot = (deg) => {
    rotRef.current = deg;
    if (innerRef.current)
      innerRef.current.style.transform = `rotateY(${-deg}deg)`;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const w = ((i * ANGLE - deg) % 360 + 360) % 360;
      const d = Math.min(w, 360 - w);
      el.style.opacity = Math.max(0.18, 1 - d / 130);
    });
  };

  const getFront = (deg) => {
    let best = Infinity, idx = 0;
    for (let i = 0; i < N; i++) {
      const w = ((i * ANGLE - deg) % 360 + 360) % 360;
      const d = Math.min(w, 360 - w);
      if (d < best) { best = d; idx = i; }
    }
    return idx;
  };

  // ── Snap-Animation (eigener rAF, kein framer-motion nötig) ─────────────────
  const snapTo = (targetIdx) => {
    // frontIdxRef sofort setzen → verhindert Doppel-Snap aus useEffect
    frontIdxRef.current = targetIdx;
    isSnapRef.current   = true;
    const from = rotRef.current;
    const diff = ((targetIdx * ANGLE - from) % 360 + 540) % 360 - 180;
    const to   = from + diff;
    const t0   = performance.now();
    const dur  = 440;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      applyRot(from + (to - from) * easeOut(t));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        rotRef.current    = to;
        isSnapRef.current = false;
        _setFrontIdx(targetIdx); // React-State für Re-Render (Styling)
      }
    };
    requestAnimationFrame(tick);
  };

  // ── Snap zum ausgewählten Typ wenn selectedId von außen gesetzt ─────────────
  useEffect(() => {
    if (!selectedId) return;
    const idx = ITEMS.findIndex(it => it.id === selectedId);
    if (idx >= 0 && idx !== frontIdxRef.current) snapTo(idx);
  }, [selectedId]);

  // ── Touch: horizontales Drag soll nicht die Seite scrollen ─────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTM = (e) => {
      if (!dragRef.current) return;
      const dx = Math.abs(e.touches[0].clientX - dragRef.current.x);
      const dy = Math.abs((e.touches[0].clientY ?? 0) - (dragRef.current.startY ?? 0));
      if (dx > dy) e.preventDefault(); // nur bei horizontalem Drag
    };
    el.addEventListener('touchmove', onTM, { passive: false });
    return () => el.removeEventListener('touchmove', onTM);
  }, []);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const startDrag = (x, y = 0) => {
    if (isSnapRef.current) return;
    dragRef.current = { x, startY: y, startRot: rotRef.current, moved: false };
  };

  const moveDrag = (x) => {
    if (!dragRef.current) return;
    const dx = x - dragRef.current.x;
    if (Math.abs(dx) > 5) dragRef.current.moved = true;
    applyRot(dragRef.current.startRot + dx * 0.50);
    const fi = getFront(rotRef.current);
    if (fi !== frontIdxRef.current) setFrontIdx(fi);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    snapTo(getFront(rotRef.current));
  };

  // ── Klick: jede Karte direkt auswählen ─────────────────────────────────────
  const onItemClick = (i, e) => {
    e.stopPropagation();
    if (dragRef.current?.moved) return; // war ein Drag, kein Klick
    snapTo(i);
    onSelect?.(ITEMS[i].id);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: 360,
        perspective: '1400px',
        perspectiveOrigin: '50% 45%',
        userSelect: 'none', cursor: 'grab',
        position: 'relative', overflow: 'visible',
      }}
      onMouseDown={e => startDrag(e.clientX, e.clientY)}
      onMouseMove={e => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      {/* Fixer X-Tilt: Vogelperspektive – Back-Card sichtbar */}
      <div style={{
        width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${TILT}deg)`,
      }}>
        {/* Y-Rotation (animiert) */}
        <div
          ref={innerRef}
          style={{
            width: '100%', height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: 'rotateY(0deg)',
          }}
        >
          {ITEMS.map((item, i) => {
            const isFront    = i === frontIdx;
            const isSelected = item.id === selectedId;
            const Icon       = item.icon;
            return (
              <div
                key={item.id}
                ref={el => { cardRefs.current[i] = el; }}
                onClick={e => onItemClick(i, e)}
                style={{
                  position: 'absolute',
                  width: 188, height: 232,
                  left: '50%', top: '50%',
                  marginLeft: -94, marginTop: -116,
                  transform: `rotateY(${i * ANGLE}deg) translateZ(${RADIUS}px)`,
                  borderRadius: 18,
                  border: isSelected
                    ? '2px solid rgba(232,96,10,0.80)'
                    : isFront
                    ? '1.5px solid rgba(232,96,10,0.55)'
                    : '1.5px solid rgba(240,236,227,0.08)',
                  boxShadow: isFront || isSelected
                    ? '0 0 0 1px rgba(232,96,10,0.10), 0 22px 60px rgba(0,0,0,0.68), 0 4px 20px rgba(232,96,10,0.18)'
                    : '0 4px 18px rgba(0,0,0,0.48)',
                  overflow: 'hidden', cursor: 'pointer',
                  background: isFront || isSelected
                    ? 'rgba(232,96,10,0.09)' : 'rgba(16,11,2,0.82)',
                  backdropFilter: 'blur(28px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                  transition: 'border-color 0.3s, box-shadow 0.3s, background 0.3s',
                }}
              >
                {/* Edge highlight */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 17, pointerEvents: 'none',
                  boxShadow: isFront || isSelected ? [
                    'inset 0 1.5px 0 rgba(255,160,60,0.24)',
                    'inset 0 -1px 0 rgba(0,0,0,0.36)',
                    'inset 1px 0 0 rgba(255,160,60,0.09)',
                    'inset -1px 0 0 rgba(255,160,60,0.09)',
                  ].join(', ') : [
                    'inset 0 1px 0 rgba(255,255,255,0.09)',
                    'inset 0 -1px 0 rgba(0,0,0,0.26)',
                  ].join(', '),
                }} />

                {/* Content */}
                <div style={{
                  position: 'relative', zIndex: 1, height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '20px 14px', gap: 9, textAlign: 'center',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isFront || isSelected
                      ? 'rgba(232,96,10,0.15)' : 'rgba(240,236,227,0.04)',
                    border: isFront || isSelected
                      ? '1px solid rgba(232,96,10,0.28)' : '1px solid rgba(240,236,227,0.08)',
                    boxShadow: isFront || isSelected ? '0 0 22px rgba(232,96,10,0.16)' : 'none',
                  }}>
                    <Icon size={24} strokeWidth={1.5}
                      style={{ color: isFront || isSelected ? '#e8600a' : 'rgba(240,236,227,0.35)' }} />
                  </div>

                  {/* Label */}
                  <div style={{
                    fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
                    color: isFront || isSelected ? '#f0ece3' : 'rgba(240,236,227,0.42)',
                  }}>
                    {item.label}
                  </div>

                  {/* Sub */}
                  <div style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: isFront || isSelected ? '#e8600a' : 'rgba(240,236,227,0.20)',
                  }}>
                    {item.sub}
                  </div>

                  {/* Desc */}
                  <div style={{
                    fontSize: 10.5, fontWeight: 500, lineHeight: 1.45,
                    color: isFront || isSelected
                      ? 'rgba(240,236,227,0.52)' : 'rgba(240,236,227,0.18)',
                  }}>
                    {item.desc}
                  </div>

                  {/* CTA */}
                  {isFront && !isSelected && (
                    <div style={{
                      marginTop: 4, padding: '6px 18px', borderRadius: 20,
                      background: 'linear-gradient(180deg, #f07320 0%, #e8600a 100%)',
                      color: '#fff', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.07em', textTransform: 'uppercase',
                      boxShadow: '0 3px 10px rgba(232,96,10,0.38)',
                      pointerEvents: 'none',
                    }}>
                      Auswählen →
                    </div>
                  )}
                  {isSelected && (
                    <div style={{
                      marginTop: 4, padding: '6px 18px', borderRadius: 20,
                      background: 'rgba(232,96,10,0.14)',
                      border: '1px solid rgba(232,96,10,0.32)',
                      color: '#e8600a', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.07em', textTransform: 'uppercase',
                      pointerEvents: 'none',
                    }}>
                      ✓ Ausgewählt
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: -18, left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none',
        fontSize: 9, fontWeight: 600, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'rgba(240,236,227,0.18)',
      }}>
        Ziehen oder Tippen zum Auswählen
      </div>
    </div>
  );
}
