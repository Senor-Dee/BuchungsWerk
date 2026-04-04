// ThemeSwitcher – Liquid Glass, Orange-Palette
import { useState, useEffect } from 'react';

const OPTIONS = [
  { key: 'dim',  label: 'Dim'  },
  { key: 'dark', label: 'Dark' },
  { key: 'hell', label: 'Hell' },
];

export function ThemeSwitcher() {
  const [active, setActive] = useState('dark');

  function select(key) {
    setActive(key);
    document.documentElement.dataset.theme = key;
    localStorage.setItem('bw-theme', key);
  }

  useEffect(() => {
    const saved = localStorage.getItem('bw-theme');
    if (saved) setActive(saved);
  }, []);

  return (
    <div style={switcherStyle}>
      {OPTIONS.map(o => (
        <button
          key={o.key}
          onClick={() => select(o.key)}
          style={active === o.key ? activeBtnStyle : btnStyle}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const switcherStyle = {
  display:     'flex',
  alignItems:  'center',
  background:  'rgba(240,236,227,0.04)',
  border:      '1px solid rgba(240,236,227,0.1)',
  borderRadius:'999px',
  padding:     '4px',
  gap:         '2px',
  filter:      'url(#lg-sm)',
  position:    'relative',
  boxShadow:   'inset 0 1px 0 rgba(255,255,255,0.05)',
};

const btnStyle = {
  padding:       '5px 14px',
  borderRadius:  '999px',
  fontSize:      '0.7rem',
  fontWeight:    700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color:         'rgba(240,236,227,0.35)',
  background:    'transparent',
  border:        'none',
  cursor:        'pointer',
  fontFamily:    "'IBM Plex Sans', system-ui, sans-serif",
  transition:    'all 0.35s cubic-bezier(0.23,1,0.32,1)',
};

const activeBtnStyle = {
  ...btnStyle,
  background:  'rgba(232,96,10,0.2)',
  color:       '#e8600a',
  boxShadow:   '0 0 16px rgba(232,96,10,0.15)',
};
