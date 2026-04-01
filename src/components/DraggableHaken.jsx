// ══════════════════════════════════════════════════════════════════════════════
// DraggableHaken – ISB-Korrekturzeichen, frei verschiebbar und löschbar
// Extrahiert aus BuchungsWerk.jsx – Phase C8 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";

function DraggableHaken({ label = "✓" }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const start = useRef(null);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  // Long-Press-Start (Touch)
  const startLongPress = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setDeleted(true);
    }, 600);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const onPointerDown = (e) => {
    if (e.button === 2) return; // Rechtsklick über onContextMenu
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    if (e.pointerType === "touch") startLongPress();
  };

  const onPointerMove = (e) => {
    if (!dragging || !start.current) return;
    const nx = start.current.ox + (e.clientX - start.current.mx);
    const ny = start.current.oy + (e.clientY - start.current.my);
    // Bewegung > 5px → kein Long-Press-Löschen
    if (Math.abs(e.clientX - start.current.mx) > 5 || Math.abs(e.clientY - start.current.my) > 5) cancelLongPress();
    setOffset({ x: nx, y: ny });
    if (Math.abs(nx) > 3 || Math.abs(ny) > 3) setMoved(true);
  };

  const onPointerUp = (e) => {
    setDragging(false);
    if (e.pointerType === "touch") cancelLongPress();
  };

  // Rechtsklick = löschen (Desktop)
  const onContextMenu = (e) => { e.preventDefault(); setDeleted(true); };

  // Doppelklick = zurücksetzen
  const onDoubleClick = () => { setOffset({ x: 0, y: 0 }); setMoved(false); };

  if (deleted) return (
    <span
      onClick={() => { setDeleted(false); setOffset({ x:0, y:0 }); setMoved(false); }}
      title="Haken wiederherstellen"
      style={{
        display: "inline-block", cursor: "pointer",
        fontFamily: "sans-serif", fontSize: 12, fontWeight: 800,
        color: "rgba(240,236,227,0.4)", background: "rgba(240,236,227,0.06)",
        border: "1.5px dashed rgba(240,236,227,0.2)", borderRadius: 3,
        padding: "0 4px", margin: "0 4px", lineHeight: 1,
        flexShrink: 0, userSelect: "none",
      }}>+</span>
  );

  return (
    <span
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      title={moved ? "Doppelklick → zurücksetzen | Rechtsklick → löschen" : "Ziehen → verschieben | Rechtsklick / Lang-Tippen → löschen"}
      style={{
        display: "inline-block",
        position: "relative",
        left: offset.x,
        top: offset.y,
        zIndex: dragging ? 200 : 1,
        cursor: dragging ? "grabbing" : "grab",
        fontFamily: "sans-serif",
        fontSize: 13,
        fontWeight: 800,
        color: "#4ade80",
        background: moved ? "rgba(74,222,128,0.15)" : "rgba(34,197,94,0.08)",
        border: `1.5px solid ${moved ? "#4ade80" : "rgba(74,222,128,0.3)"}`,
        borderRadius: 3,
        padding: "0 4px",
        margin: "0 4px",
        lineHeight: 1,
        flexShrink: 0,
        userSelect: "none",
        touchAction: "none",
        boxShadow: dragging ? "0 4px 12px rgba(0,0,0,.18)" : moved ? "0 1px 4px rgba(0,0,0,.10)" : "none",
        transition: dragging ? "none" : "box-shadow .15s",
      }}
    >{label}</span>
  );
}


export default DraggableHaken;
