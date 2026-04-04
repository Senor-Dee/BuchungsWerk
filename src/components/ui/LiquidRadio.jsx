// LiquidRadio – Liquid Glass Radio Switcher
// Basiert auf liquid-radio.tsx (OriginUI) – adaptiert für plain JSX / Inline-Styles
// Kein Radix, kein Tailwind, kein TypeScript
import { useState, useRef } from 'react';

// Der SVG-Filter #radio-glass muss in SvgFilters (main.jsx) definiert sein.

/**
 * LiquidRadio – Tab-Switcher im Liquid-Glass-Stil
 *
 * Props:
 *   options   : [{ key, label, icon? }]  (icon = Lucide-Komponente optional)
 *   value     : aktiver key
 *   onChange  : (key) => void
 *   size      : 'sm' | 'md' (default 'md')
 */
export function LiquidRadio({ options, value, onChange, size = 'md' }) {
  const activeIdx  = options.findIndex(o => o.key === value);
  const safeIdx    = activeIdx < 0 ? 0 : activeIdx;
  const n          = options.length;

  // Drag-Support (wie im alten BelegGFSlider)
  const startXRef      = useRef(0);
  const isDraggingRef  = useRef(false);
  const startIdxRef    = useRef(safeIdx);

  const h   = size === 'sm' ? 28 : 32;
  const fs  = size === 'sm' ? 10 : 11;
  const px  = size === 'sm' ? 8  : 10;

  function onDown(e) {
    startXRef.current     = e.clientX;
    startIdxRef.current   = safeIdx;
    isDraggingRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (Math.abs(e.clientX - startXRef.current) >= 6) isDraggingRef.current = true;
  }
  function onUp(e) {
    if (isDraggingRef.current) {
      // Grobe Schätzung: wie viele Tabs hat der Drag überquert
      const rect  = e.currentTarget.getBoundingClientRect();
      const tabW  = rect.width / n;
      const newIdx = Math.max(0, Math.min(n - 1,
        Math.round((e.clientX - rect.left) / tabW)
      ));
      if (newIdx !== safeIdx) onChange(options[newIdx].key);
    }
    isDraggingRef.current = false;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: h,
        borderRadius: h / 2,
        padding: 2,
        background: 'rgba(240,236,227,0.06)',
        border: '1px solid rgba(240,236,227,0.14)',
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* ── Sliding Glass Pill ────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          // width = (container - 4px padding) / n, translated by activeIdx steps
          width: `calc((100% - 4px) / ${n})`,
          height: h - 4,
          borderRadius: (h - 4) / 2,
          transform: `translateX(calc(${safeIdx} * 100%))`,
          transition: 'transform 280ms cubic-bezier(0.16,1,0.3,1)',
          // Glass pill: dark background + inset highlights
          background: 'rgba(232,96,10,0.22)',
          boxShadow: [
            '0 0 0 1px rgba(232,96,10,0.55)',
            'inset 2px 2px 0.5px -2px rgba(255,255,255,0.35)',
            'inset -2px -2px 0.5px -2px rgba(255,255,255,0.20)',
            'inset 0 0 6px 4px rgba(232,96,10,0.08)',
            '0 2px 8px rgba(232,96,10,0.30)',
          ].join(','),
          // Liquid-Glass-Verzerrungs-Filter
          filter: 'url(#radio-glass)',
          zIndex: 0,
        }}
      />

      {/* ── Labels ───────────────────────────────────────────────── */}
      {options.map((opt, i) => {
        const isActive = i === safeIdx;
        const Icon     = opt.icon;
        return (
          <button
            key={opt.key}
            onClick={() => { if (!isDraggingRef.current) onChange(opt.key); }}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              minWidth: size === 'sm' ? 42 : 52,
              height: h - 4,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              paddingLeft: px,
              paddingRight: px,
              borderRadius: (h - 4) / 2,
              fontSize: fs,
              fontWeight: 700,
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              color: isActive ? '#fff' : 'rgba(240,236,227,0.38)',
              transition: 'color 260ms',
            }}
          >
            {Icon && <Icon size={fs} strokeWidth={2.5} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
