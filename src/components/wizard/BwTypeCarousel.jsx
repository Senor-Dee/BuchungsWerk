// BwTypeCarousel – 3D Orbital-Karussell, Vogelperspektive
// Karten zeigen IMMER zur Kamera (orbitierend, kein Zylinder-Drehen)
// Interaction: Maus-Drag + Touch-Drag + Wheel + Direktklick
import { useRef, useEffect, useState } from 'react';
import { PenLine, ClipboardList, Factory, ReceiptEuro } from 'lucide-react';

const ITEMS = [
  { id: 'Übung',       icon: PenLine,      label: 'Übung',       sub: 'Aufgaben üben',      desc: 'Buchungsaufgaben nach Klasse & Lernbereich' },
  { id: 'Prüfung',     icon: ClipboardList,label: 'Prüfung',     sub: 'Schulaufgabe',        desc: 'Bewertete Prüfung mit Punkteschema' },
  { id: 'Simulation',  icon: Factory,      label: 'Simulation',  sub: 'Firma führen',        desc: 'Vollständige Buchführungssimulation' },
  { id: 'Beleg-Editor',icon: ReceiptEuro,  label: 'Beleg-Editor',sub: 'Belege gestalten',    desc: 'Belege erstellen & exportieren' },
];

const N      = ITEMS.length; // 4
const ANGLE  = 360 / N;      // 90°
const RADIUS = 240;          // Kreis-Radius – kleiner = Kacheln können leicht überlappen
const TILT   = -14;          // deg rotateX – moderater Bird's-Eye (weniger Projektion nach unten)
const CARD_W = 160;          // schmälere Kacheln
const CARD_H = 200;

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

export function BwTypeCarousel({ onSelect, selectedId }) {
  const containerRef  = useRef(null);
  const cardRefs      = useRef([]);
  const rotRef        = useRef(0);
  const isSnapRef     = useRef(false);
  const dragRef       = useRef(null);
  const frontIdxRef   = useRef(0);
  const wheelTimerRef = useRef(null);
  const [frontIdx, _setFrontIdx] = useState(0);

  const setFrontIdx = (i) => { frontIdxRef.current = i; _setFrontIdx(i); };

  // ── Orbital-Positionierung: Karten bleiben immer zur Kamera gewandt ─────────
  const applyRot = (deg) => {
    rotRef.current = deg;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const angleDeg = i * ANGLE - deg;
      const rad = angleDeg * Math.PI / 180;
      const x = Math.sin(rad) * RADIUS;
      const z = Math.cos(rad) * RADIUS;
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0px, ${z.toFixed(2)}px)`;
      const w = ((angleDeg % 360) + 360) % 360;
      const d = Math.min(w, 360 - w);
      el.style.opacity = Math.max(0.15, 1 - d / 120);
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

  // ── Snap-Animation ──────────────────────────────────────────────────────────
  const snapTo = (targetIdx) => {
    frontIdxRef.current = targetIdx;
    isSnapRef.current   = true;
    const from = rotRef.current;
    const diff = ((targetIdx * ANGLE - from) % 360 + 540) % 360 - 180;
    const to   = from + diff;
    const t0   = performance.now();
    const dur  = 420;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      applyRot(from + (to - from) * easeOut(t));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        rotRef.current    = to;
        isSnapRef.current = false;
        _setFrontIdx(targetIdx);
      }
    };
    requestAnimationFrame(tick);
  };

  // Initiale Positionierung nach Mount
  useEffect(() => { applyRot(rotRef.current); }, []);

  // Snap zu selectedId wenn von außen gesetzt
  useEffect(() => {
    if (!selectedId) return;
    const idx = ITEMS.findIndex(it => it.id === selectedId);
    if (idx >= 0 && idx !== frontIdxRef.current) snapTo(idx);
  }, [selectedId]);

  // Touch: horizontales Drag → kein Seiten-Scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTM = (e) => {
      if (!dragRef.current) return;
      const dx = Math.abs(e.touches[0].clientX - dragRef.current.x);
      const dy = Math.abs((e.touches[0].clientY ?? 0) - (dragRef.current.startY ?? 0));
      if (dx > dy) e.preventDefault();
    };
    el.addEventListener('touchmove', onTM, { passive: false });
    return () => el.removeEventListener('touchmove', onTM);
  }, []);

  // Wheel: dreht das Karussell (Page-Scroll verhindert solange Cursor über Container)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (isSnapRef.current) return;
      e.preventDefault();
      // Normalisiertes Delta: Mausrad und Trackpad angleichen, Beschleunigung begrenzen
      const dy = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 80);
      applyRot(rotRef.current + dy * 0.22);
      const fi = getFront(rotRef.current);
      if (fi !== frontIdxRef.current) setFrontIdx(fi);
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => snapTo(getFront(rotRef.current)), 280);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
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
    applyRot(dragRef.current.startRot + dx * 0.48);
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
    if (dragRef.current?.moved) return;
    snapTo(i);
    onSelect?.(ITEMS[i].id);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: 340,
        perspective: '1200px',
        perspectiveOrigin: '50% 28%',
        userSelect: 'none', cursor: 'grab',
        position: 'relative', overflow: 'visible',
      }}
      onMouseDown={e => startDrag(e.clientX, e.clientY)}
      onMouseMove={e => { if (dragRef.current) moveDrag(e.clientX); }}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => { if (dragRef.current) moveDrag(e.touches[0].clientX); }}
      onTouchEnd={endDrag}
    >
      {/* Fixer X-Tilt: Vogelperspektive */}
      <div style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', transform: `rotateX(${TILT}deg)` }}>
        {/* Orbital-Container: Karten bewegen sich einzeln (kein rotateY hier) */}
        <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}>
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
                  width: CARD_W, height: CARD_H,
                  left: '50%', top: '45%',
                  marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
                  transform: 'translate3d(0,0,0)', // wird von applyRot gesetzt
                  borderRadius: 18,
                  border: isSelected
                    ? '2px solid rgba(232,96,10,0.85)'
                    : isFront
                    ? '1.5px solid rgba(232,96,10,0.55)'
                    : '1.5px solid rgba(240,236,227,0.07)',
                  boxShadow: isFront || isSelected
                    ? '0 0 0 1px rgba(232,96,10,0.10), 0 24px 64px rgba(0,0,0,0.72), 0 4px 22px rgba(232,96,10,0.20)'
                    : '0 4px 16px rgba(0,0,0,0.44)',
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
                    'inset 0 1.5px 0 rgba(255,160,60,0.26)',
                    'inset 0 -1px 0 rgba(0,0,0,0.36)',
                    'inset 1px 0 0 rgba(255,160,60,0.09)',
                    'inset -1px 0 0 rgba(255,160,60,0.09)',
                  ].join(', ') : 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.24)',
                }} />

                {/* Content */}
                <div style={{
                  position: 'relative', zIndex: 1, height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '18px 12px', gap: 8, textAlign: 'center',
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 13, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isFront || isSelected ? 'rgba(232,96,10,0.15)' : 'rgba(240,236,227,0.04)',
                    border: isFront || isSelected ? '1px solid rgba(232,96,10,0.28)' : '1px solid rgba(240,236,227,0.07)',
                    boxShadow: isFront || isSelected ? '0 0 20px rgba(232,96,10,0.18)' : 'none',
                  }}>
                    <Icon size={22} strokeWidth={1.5}
                      style={{ color: isFront || isSelected ? '#e8600a' : 'rgba(240,236,227,0.32)' }} />
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
                    color: isFront || isSelected ? '#f0ece3' : 'rgba(240,236,227,0.38)' }}>
                    {item.label}
                  </div>

                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                    color: isFront || isSelected ? '#e8600a' : 'rgba(240,236,227,0.18)' }}>
                    {item.sub}
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.45,
                    color: isFront || isSelected ? 'rgba(240,236,227,0.50)' : 'rgba(240,236,227,0.16)' }}>
                    {item.desc}
                  </div>

                  {isFront && !isSelected && (
                    <div style={{
                      marginTop: 4, padding: '5px 16px', borderRadius: 20,
                      background: 'linear-gradient(180deg, #f07320 0%, #e8600a 100%)',
                      color: '#fff', fontSize: 9.5, fontWeight: 700,
                      letterSpacing: '0.07em', textTransform: 'uppercase',
                      boxShadow: '0 3px 10px rgba(232,96,10,0.38)', pointerEvents: 'none',
                    }}>Auswählen →</div>
                  )}
                  {isSelected && (
                    <div style={{
                      marginTop: 4, padding: '5px 16px', borderRadius: 20,
                      background: 'rgba(232,96,10,0.14)',
                      border: '1px solid rgba(232,96,10,0.32)',
                      color: '#e8600a', fontSize: 9.5, fontWeight: 700,
                      letterSpacing: '0.07em', textTransform: 'uppercase', pointerEvents: 'none',
                    }}>✓ Ausgewählt</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: -20, left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none',
        fontSize: 9, fontWeight: 600, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'rgba(240,236,227,0.16)',
      }}>
        Ziehen · Scrollen · Tippen
      </div>
    </div>
  );
}
