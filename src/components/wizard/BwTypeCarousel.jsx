// BwTypeCarousel – 3D Zylinder-Karussell für die 4 Hauptmodi
// Interaction: Wheel + Maus-Drag + Touch-Drag → Snap to nearest item
// Performance: direkte DOM-Manipulation für Rotation + Opacity (kein Re-Render pro Frame)
import { useRef, useEffect, useState } from 'react';
import { useAnimationFrame } from 'framer-motion';
import { PenLine, ClipboardList, Factory, ReceiptEuro } from 'lucide-react';

const ITEMS = [
  {
    id: 'Übung',
    icon: PenLine,
    label: 'Übung',
    sub: 'Aufgaben üben',
    desc: 'Buchungsaufgaben nach Klasse & Lernbereich zusammenstellen',
  },
  {
    id: 'Prüfung',
    icon: ClipboardList,
    label: 'Prüfung',
    sub: 'Schulaufgabe',
    desc: 'Bewertete Prüfung mit Punkteschema und Lösungsblatt',
  },
  {
    id: 'Simulation',
    icon: Factory,
    label: 'Simulation',
    sub: 'Firma führen',
    desc: 'Vollständige Buchführungssimulation mit Belegerfassung',
  },
  {
    id: 'Beleg-Editor',
    icon: ReceiptEuro,
    label: 'Beleg-Editor',
    sub: 'Belege gestalten',
    desc: 'Eigene Belege erstellen, bearbeiten und exportieren',
  },
];

const N      = ITEMS.length; // 4
const ANGLE  = 360 / N;      // 90°
const RADIUS = 230;          // px Tiefe
const AUTO   = 0.055;        // deg/frame (~3°/s bei 60fps)

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

export function BwTypeCarousel({ onSelect, selectedId }) {
  const containerRef  = useRef(null);
  const innerRef      = useRef(null);
  const cardRefs      = useRef([]);
  const rotRef        = useRef(0);
  const velRef        = useRef(0);
  const isInterRef    = useRef(false);
  const isSnapRef     = useRef(false);
  const dragRef       = useRef(null); // { x, startRot, lastX, moved }
  const snapTimerRef  = useRef(null);
  const frontIdxRef   = useRef(0);
  const [frontIdx, _setFrontIdx] = useState(0);

  const setFrontIdx = (i) => { frontIdxRef.current = i; _setFrontIdx(i); };

  // ── Direkte DOM-Rotation + Opacity ──────────────────────────────────────────
  const applyRot = (deg) => {
    rotRef.current = deg;
    if (innerRef.current)
      innerRef.current.style.transform = `rotateY(${-deg}deg)`;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const w = ((i * ANGLE - deg) % 360 + 360) % 360;
      const d = Math.min(w, 360 - w);
      el.style.opacity = Math.max(0.16, 1 - d / 138);
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

  // ── Snap-Animation via rAF (smooth opacity + rotation) ──────────────────────
  const snapTo = (targetIdx) => {
    isSnapRef.current = true;
    const from = rotRef.current;
    const diff = ((targetIdx * ANGLE - from) % 360 + 540) % 360 - 180;
    const to   = from + diff;
    const t0   = performance.now();
    const dur  = 460;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      applyRot(from + (to - from) * easeOut(t));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        rotRef.current = to;
        isSnapRef.current = false;
        setFrontIdx(targetIdx);
      }
    };
    requestAnimationFrame(tick);
  };

  // ── Auto-Rotation (framer-motion rAF, pausiert bei Interaktion/Snap) ────────
  useAnimationFrame(() => {
    if (isInterRef.current || isSnapRef.current) return;
    if (Math.abs(velRef.current) > 0.07) {
      velRef.current *= 0.91;
      applyRot(rotRef.current + velRef.current);
    } else {
      velRef.current = 0;
      applyRot(rotRef.current + AUTO);
    }
    const fi = getFront(rotRef.current);
    if (fi !== frontIdxRef.current) setFrontIdx(fi);
  });

  // ── Wheel (passive:false um Page-Scroll zu blockieren) ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      clearTimeout(snapTimerRef.current);
      isInterRef.current = true;
      isSnapRef.current  = false;
      velRef.current = 0;
      applyRot(rotRef.current + e.deltaY * 0.13);
      setFrontIdx(getFront(rotRef.current));
      snapTimerRef.current = setTimeout(() => {
        isInterRef.current = false;
        snapTo(getFront(rotRef.current));
      }, 440);
    };
    const onTouchMoveNative = (e) => { if (dragRef.current) e.preventDefault(); };
    el.addEventListener('wheel',     onWheel,          { passive: false });
    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    return () => {
      el.removeEventListener('wheel',     onWheel);
      el.removeEventListener('touchmove', onTouchMoveNative);
    };
  }, []);

  // ── Snap zu ausgewähltem Typ wenn von außen gesetzt ──────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    const idx = ITEMS.findIndex(it => it.id === selectedId);
    if (idx >= 0 && idx !== frontIdxRef.current) snapTo(idx);
  }, [selectedId]);

  // ── Drag-Helpers ─────────────────────────────────────────────────────────────
  const startDrag = (x) => {
    clearTimeout(snapTimerRef.current);
    isInterRef.current = true;
    isSnapRef.current  = false;
    velRef.current     = 0;
    dragRef.current    = { x, startRot: rotRef.current, lastX: x, moved: false };
  };
  const moveDrag = (x) => {
    if (!dragRef.current) return;
    const dx = x - dragRef.current.x;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    velRef.current        = (x - dragRef.current.lastX) * 0.55;
    dragRef.current.lastX = x;
    applyRot(dragRef.current.startRot + dx * 0.47);
    setFrontIdx(getFront(rotRef.current));
  };
  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current    = null;
    isInterRef.current = false;
    snapTo(getFront(rotRef.current));
  };

  const onItemClick = (i, e) => {
    e.stopPropagation();
    if (dragRef.current?.moved) return;
    if (i !== frontIdxRef.current) { snapTo(i); return; }
    onSelect?.(ITEMS[i].id);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: 300,
        perspective: '1600px', perspectiveOrigin: '50% 50%',
        userSelect: 'none', cursor: 'grab',
        position: 'relative', overflow: 'visible',
      }}
      onMouseDown={e => startDrag(e.clientX)}
      onMouseMove={e => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => startDrag(e.touches[0].clientX)}
      onTouchMove={e => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      {/* ── 3D-Zylinder ── */}
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
                width: 190, height: 238,
                left: '50%', top: '50%',
                marginLeft: -95, marginTop: -119,
                transform: `rotateY(${i * ANGLE}deg) translateZ(${RADIUS}px)`,
                borderRadius: 18,
                border: isSelected
                  ? '2px solid rgba(232,96,10,0.75)'
                  : isFront
                  ? '1.5px solid rgba(232,96,10,0.52)'
                  : '1.5px solid rgba(240,236,227,0.08)',
                boxShadow: isFront || isSelected
                  ? '0 0 0 1px rgba(232,96,10,0.10), 0 22px 60px rgba(0,0,0,0.68), 0 4px 20px rgba(232,96,10,0.16)'
                  : '0 4px 18px rgba(0,0,0,0.48)',
                overflow: 'hidden', cursor: 'pointer',
                background: isFront || isSelected
                  ? 'rgba(232,96,10,0.09)'
                  : 'rgba(16,11,2,0.82)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                transition: 'border-color 0.32s, box-shadow 0.32s, background 0.32s',
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
                padding: '22px 14px', gap: 10, textAlign: 'center',
              }}>
                {/* Icon */}
                <div style={{
                  width: 54, height: 54, borderRadius: 15, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isFront || isSelected
                    ? 'rgba(232,96,10,0.15)' : 'rgba(240,236,227,0.04)',
                  border: isFront || isSelected
                    ? '1px solid rgba(232,96,10,0.28)' : '1px solid rgba(240,236,227,0.08)',
                  boxShadow: isFront || isSelected
                    ? '0 0 24px rgba(232,96,10,0.16)' : 'none',
                }}>
                  <Icon
                    size={26} strokeWidth={1.5}
                    style={{ color: isFront || isSelected ? '#e8600a' : 'rgba(240,236,227,0.36)' }}
                  />
                </div>

                {/* Label */}
                <div style={{
                  fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
                  color: isFront || isSelected ? '#f0ece3' : 'rgba(240,236,227,0.44)',
                }}>
                  {item.label}
                </div>

                {/* Sub */}
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: isFront || isSelected ? '#e8600a' : 'rgba(240,236,227,0.20)',
                }}>
                  {item.sub}
                </div>

                {/* Desc */}
                <div style={{
                  fontSize: 10.5, fontWeight: 500, lineHeight: 1.5,
                  color: isFront || isSelected
                    ? 'rgba(240,236,227,0.52)' : 'rgba(240,236,227,0.18)',
                }}>
                  {item.desc}
                </div>

                {/* CTA */}
                {isFront && !isSelected && (
                  <div style={{
                    marginTop: 6, padding: '7px 20px', borderRadius: 20,
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
                    marginTop: 6, padding: '7px 20px', borderRadius: 20,
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

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: -20, left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none',
        fontSize: 9, fontWeight: 600, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'rgba(240,236,227,0.18)',
      }}>
        Scrollen · Ziehen · Klicken zum Auswählen
      </div>
    </div>
  );
}
