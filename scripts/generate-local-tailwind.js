const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONTENT_GLOBS = [
  'index.html',
  'src/**/*.js',
  'public/**/*.html',
];
const OUT = path.join(ROOT, 'public/assets/app.css');

const colors = {
  white: '#fff', black: '#000', transparent: 'transparent', current: 'currentColor',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b', 'slate-900': '#0f172a', 'slate-950': '#020617',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280', 'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937', 'gray-900': '#111827', 'gray-950': '#030712',
  'zinc-50': '#fafafa', 'zinc-100': '#f4f4f5', 'zinc-200': '#e4e4e7', 'zinc-300': '#d4d4d8', 'zinc-400': '#a1a1aa', 'zinc-500': '#71717a', 'zinc-600': '#52525b', 'zinc-700': '#3f3f46', 'zinc-800': '#27272a', 'zinc-900': '#18181b', 'zinc-950': '#09090b',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca', 'red-300': '#fca5a5', 'red-400': '#f87171', 'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c', 'red-800': '#991b1b', 'red-900': '#7f1d1d', 'red-950': '#450a0a',
  'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa', 'orange-300': '#fdba74', 'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-600': '#ea580c', 'orange-700': '#c2410c', 'orange-800': '#9a3412', 'orange-900': '#7c2d12',
  'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e', 'amber-900': '#78350f',
  'yellow-50': '#fefce8', 'yellow-100': '#fef9c3', 'yellow-200': '#fef08a', 'yellow-300': '#fde047', 'yellow-400': '#facc15', 'yellow-500': '#eab308', 'yellow-600': '#ca8a04', 'yellow-700': '#a16207', 'yellow-800': '#854d0e', 'yellow-900': '#713f12',
  'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0', 'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534', 'green-900': '#14532d',
  'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0', 'emerald-300': '#6ee7b7', 'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'emerald-700': '#047857', 'emerald-800': '#065f46', 'emerald-900': '#064e3b',
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe', 'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af', 'blue-900': '#1e3a8a',
  'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe', 'indigo-300': '#a5b4fc', 'indigo-400': '#818cf8', 'indigo-500': '#6366f1', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca', 'indigo-800': '#3730a3', 'indigo-900': '#312e81',
  'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe', 'purple-400': '#c084fc', 'purple-500': '#a855f7', 'purple-600': '#9333ea', 'purple-700': '#7e22ce', 'purple-800': '#6b21a8', 'purple-900': '#581c87',
  'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3', 'rose-300': '#fda4af', 'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c', 'rose-800': '#9f1239', 'rose-900': '#881337',
  'pink-50': '#fdf2f8', 'pink-100': '#fce7f3', 'pink-200': '#fbcfe8', 'pink-300': '#f9a8d4', 'pink-400': '#f472b6', 'pink-500': '#ec4899', 'pink-600': '#db2777', 'pink-700': '#be185d', 'pink-800': '#9d174d', 'pink-900': '#831843',
  'brand-50': '#EAEAFF', 'brand-100': '#EAEAFF', 'brand-200': '#CFCFFF', 'brand-300': '#B8B8FF', 'brand-400': '#9F9FFF', 'brand-500': '#7F7FFF', 'brand-600': '#6B6BFF', 'brand-700': '#5656E8', 'brand-800': '#4646BA', 'brand-900': '#34348F',
};
const screens = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' };
const spacingScale = {
  px: '1px', 0: '0', '0.5': '0.125rem', 1: '0.25rem', '1.5': '0.375rem', 2: '0.5rem', '2.5': '0.625rem', 3: '0.75rem', '3.5': '0.875rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem', 9: '2.25rem', 10: '2.5rem', 11: '2.75rem', 12: '3rem', 14: '3.5rem', 16: '4rem', 20: '5rem', 24: '6rem', 28: '7rem', 32: '8rem', 36: '9rem', 40: '10rem', 44: '11rem', 48: '12rem', 52: '13rem', 56: '14rem', 60: '15rem', 64: '16rem', 72: '18rem', 80: '20rem', 96: '24rem'
};
const fontSizes = { xs: '.75rem', sm: '.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem', '7xl': '4.5rem' };
const maxWidths = { xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem', '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem', full: '100%', none: 'none', prose: '65ch', screen: '100vw' };

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
function filesForGlob(glob) {
  if (!glob.includes('**')) return fs.existsSync(path.join(ROOT, glob)) ? [path.join(ROOT, glob)] : [];
  const [base, suffix] = glob.split('/**/');
  const ext = suffix.replace('*', '');
  return walk(path.join(ROOT, base)).filter(f => f.endsWith(ext));
}
function esc(s) { return s.replace(/([^a-zA-Z0-9_-])/g, '\\$1'); }
function arbitrary(v) { return v && v.startsWith('[') && v.endsWith(']') ? v.slice(1, -1).replace(/_/g, ' ') : null; }
function alphaHex(hex, a) {
  if (hex === '#fff') return `rgba(255,255,255,${a})`;
  if (hex === '#000') return `rgba(0,0,0,${a})`;
  const m = hex.match(/^#(..)(..)(..)$/);
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
}
function colorVal(v) {
  const slash = v.lastIndexOf('/');
  const name = slash >= 0 ? v.slice(0, slash) : v;
  const op = slash >= 0 ? v.slice(slash + 1) : '';
  const c = colors[name] || arbitrary(name);
  if (!c) return null;
  if (!op) return c;
  const a = op.startsWith('[') && op.endsWith(']') ? Number(op.slice(1, -1)) : Number(op) / 100;
  return Number.isFinite(a) ? alphaHex(c, a) : c;
}
function spacing(v) { return arbitrary(v) || spacingScale[v] || null; }
function fraction(v) {
  if (v === 'full') return '100%';
  const m = v.match(/^(\d+)\/(\d+)$/);
  return m ? `${(Number(m[1]) / Number(m[2])) * 100}%` : null;
}
function sizeVal(v, axis) { return arbitrary(v) || spacing(v) || fraction(v) || ({ auto: 'auto', px: '1px', min: 'min-content', max: 'max-content', fit: 'fit-content', full: '100%', screen: axis === 'h' ? '100vh' : '100vw' }[v]); }

function decl(base) {
  const staticMap = {
    container: 'width:100%', hidden: 'display:none', block: 'display:block', 'inline-block': 'display:inline-block', inline: 'display:inline', flex: 'display:flex', 'inline-flex': 'display:inline-flex', grid: 'display:grid', contents: 'display:contents', table: 'display:table',
    static: 'position:static', relative: 'position:relative', absolute: 'position:absolute', fixed: 'position:fixed', sticky: 'position:sticky',
    'pointer-events-none': 'pointer-events:none', 'pointer-events-auto': 'pointer-events:auto', visible: 'visibility:visible', invisible: 'visibility:hidden',
    'overflow-hidden': 'overflow:hidden', 'overflow-auto': 'overflow:auto', 'overflow-y-auto': 'overflow-y:auto', 'overflow-x-auto': 'overflow-x:auto', 'overflow-y-hidden': 'overflow-y:hidden', 'overflow-x-hidden': 'overflow-x:hidden',
    'object-cover': 'object-fit:cover', 'object-contain': 'object-fit:contain', 'object-center': 'object-position:center',
    'flex-1': 'flex:1 1 0%', 'flex-auto': 'flex:1 1 auto', 'flex-none': 'flex:none', 'flex-row': 'flex-direction:row', 'flex-col': 'flex-direction:column', 'flex-wrap': 'flex-wrap:wrap', 'flex-nowrap': 'flex-wrap:nowrap', 'shrink-0': 'flex-shrink:0', shrink: 'flex-shrink:1', grow: 'flex-grow:1', 'grow-0': 'flex-grow:0',
    'items-start': 'align-items:flex-start', 'items-center': 'align-items:center', 'items-end': 'align-items:flex-end', 'items-stretch': 'align-items:stretch', 'items-baseline': 'align-items:baseline',
    'justify-start': 'justify-content:flex-start', 'justify-center': 'justify-content:center', 'justify-end': 'justify-content:flex-end', 'justify-between': 'justify-content:space-between', 'justify-around': 'justify-content:space-around', 'justify-evenly': 'justify-content:space-evenly',
    'self-start': 'align-self:flex-start', 'self-center': 'align-self:center', 'self-end': 'align-self:flex-end', 'content-center': 'align-content:center',
    'text-left': 'text-align:left', 'text-center': 'text-align:center', 'text-right': 'text-align:right', uppercase: 'text-transform:uppercase', lowercase: 'text-transform:lowercase', capitalize: 'text-transform:capitalize',
    truncate: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap', 'whitespace-nowrap': 'white-space:nowrap', 'whitespace-normal': 'white-space:normal', 'whitespace-pre-line': 'white-space:pre-line', 'break-words': 'overflow-wrap:break-word', 'text-ellipsis': 'text-overflow:ellipsis',
    'font-thin': 'font-weight:100', 'font-light': 'font-weight:300', 'font-normal': 'font-weight:400', 'font-medium': 'font-weight:500', 'font-semibold': 'font-weight:600', 'font-bold': 'font-weight:700', 'font-extrabold': 'font-weight:800', 'font-black': 'font-weight:900',
    'leading-none': 'line-height:1', 'leading-tight': 'line-height:1.25', 'leading-snug': 'line-height:1.375', 'leading-normal': 'line-height:1.5', 'leading-relaxed': 'line-height:1.625', 'leading-loose': 'line-height:2',
    'tracking-tight': 'letter-spacing:-.025em', 'tracking-wide': 'letter-spacing:.025em', 'tracking-wider': 'letter-spacing:.05em', 'tracking-widest': 'letter-spacing:.1em',
    italic: 'font-style:italic', 'not-italic': 'font-style:normal', underline: 'text-decoration-line:underline', 'no-underline': 'text-decoration-line:none',
    'rounded-full': 'border-radius:9999px', border: 'border-width:1px', 'border-0': 'border-width:0', 'border-2': 'border-width:2px', 'border-4': 'border-width:4px', 'border-t': 'border-top-width:1px', 'border-b': 'border-bottom-width:1px', 'border-l': 'border-left-width:1px', 'border-r': 'border-right-width:1px', 'border-b-2': 'border-bottom-width:2px', 'border-l-4': 'border-left-width:4px', 'border-dashed': 'border-style:dashed', 'border-solid': 'border-style:solid',
    shadow: 'box-shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)', 'shadow-sm': 'box-shadow:0 1px 2px rgba(0,0,0,.05)', 'shadow-md': 'box-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)', 'shadow-lg': 'box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)', 'shadow-xl': 'box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)', 'shadow-2xl': 'box-shadow:0 25px 50px -12px rgba(0,0,0,.25)', 'shadow-none': 'box-shadow:none',
    transition: 'transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms', 'transition-all': 'transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms', 'transition-colors': 'transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms',
    'duration-75': 'transition-duration:75ms', 'duration-100': 'transition-duration:100ms', 'duration-150': 'transition-duration:150ms', 'duration-200': 'transition-duration:200ms', 'duration-300': 'transition-duration:300ms', 'duration-500': 'transition-duration:500ms', 'ease-in-out': 'transition-timing-function:cubic-bezier(.4,0,.2,1)',
    'cursor-pointer': 'cursor:pointer', 'cursor-not-allowed': 'cursor:not-allowed', 'select-none': 'user-select:none', 'resize-none': 'resize:none', 'appearance-none': 'appearance:none',
    'mx-auto': 'margin-left:auto;margin-right:auto', 'my-auto': 'margin-top:auto;margin-bottom:auto', 'mt-auto': 'margin-top:auto', 'ml-auto': 'margin-left:auto', 'mr-auto': 'margin-right:auto',
    'aspect-square': 'aspect-ratio:1 / 1', 'aspect-video': 'aspect-ratio:16 / 9', 'backdrop-blur': 'backdrop-filter:blur(8px)', 'backdrop-blur-sm': 'backdrop-filter:blur(4px)', 'backdrop-blur-md': 'backdrop-filter:blur(12px)',
    'drop-shadow-lg': 'filter:drop-shadow(0 10px 8px rgb(0 0 0 / .04)) drop-shadow(0 4px 3px rgb(0 0 0 / .1))', 'drop-shadow-xl': 'filter:drop-shadow(0 20px 13px rgb(0 0 0 / .03)) drop-shadow(0 8px 5px rgb(0 0 0 / .08))', 'drop-shadow-2xl': 'filter:drop-shadow(0 25px 25px rgb(0 0 0 / .15))',
    'outline-none': 'outline:2px solid transparent;outline-offset:2px', 'align-top': 'vertical-align:top', 'font-sans': "font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", 'font-mono': "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace",
    'bg-cover': 'background-size:cover', 'bg-contain': 'background-size:contain', 'bg-center': 'background-position:center', 'bg-gradient-to-t': 'background-image:linear-gradient(to top,var(--tw-gradient-stops))', 'bg-gradient-to-br': 'background-image:linear-gradient(to bottom right,var(--tw-gradient-stops))', 'bg-gradient-to-tr': 'background-image:linear-gradient(to top right,var(--tw-gradient-stops))',
    'animate-spin': 'animation:spin 1s linear infinite', 'animate-pulse': 'animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite', 'blur-3xl': 'filter:blur(64px)', 'cursor-zoom-in': 'cursor:zoom-in', 'transform': 'transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))', 'sr-only': 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0',
  };
  if (staticMap[base]) return staticMap[base];
  let m, val;
  if ((m = base.match(/^(-?)(inset-x|inset-y|inset|top|right|bottom|left)-(.+)$/))) { val = sizeVal(m[3]); if (!val) return ''; if (m[1]) val = `-${val}`; const map = { inset: 'inset', top: 'top', right: 'right', bottom: 'bottom', left: 'left' }; if (map[m[2]]) return `${map[m[2]]}:${val}`; return m[2] === 'inset-x' ? `left:${val};right:${val}` : `top:${val};bottom:${val}`; }
  if ((m = base.match(/^z-(.+)$/))) { val = arbitrary(m[1]) || m[1]; return /^-?\d+$/.test(val) ? `z-index:${val}` : ''; }
  if ((m = base.match(/^order-(first|last|none|\d+)$/))) return `order:${{ first: '-9999', last: '9999', none: '0' }[m[1]] || m[1]}`;
  if ((m = base.match(/^grid-cols-(\d+)$/))) return `grid-template-columns:repeat(${m[1]},minmax(0,1fr))`;
  if ((m = base.match(/^col-span-(\d+|full)$/))) return m[1] === 'full' ? 'grid-column:1 / -1' : `grid-column:span ${m[1]} / span ${m[1]}`;
  if ((val = arbitrary(base.match(/^grid-cols-(\[.*\])$/)?.[1] || ''))) return `grid-template-columns:${val}`;
  if ((m = base.match(/^(-?)(gap-x|gap-y|gap|px|py|pt|pr|pb|pl|p|mx|my|mt|mr|mb|ml|m)-(.+)$/))) { val = spacing(m[3]); if (!val) return ''; if (m[1]) val = `-${val}`; const props = { gap: ['gap'], 'gap-x': ['column-gap'], 'gap-y': ['row-gap'], p: ['padding'], px: ['padding-left', 'padding-right'], py: ['padding-top', 'padding-bottom'], pt: ['padding-top'], pr: ['padding-right'], pb: ['padding-bottom'], pl: ['padding-left'], m: ['margin'], mx: ['margin-left', 'margin-right'], my: ['margin-top', 'margin-bottom'], mt: ['margin-top'], mr: ['margin-right'], mb: ['margin-bottom'], ml: ['margin-left'] }[m[2]]; return props.map(p => `${p}:${val}`).join(';'); }
  if ((m = base.match(/^(w|h|min-w|min-h|max-w|max-h)-(.+)$/))) { val = maxWidths[m[2]] && m[1] === 'max-w' ? maxWidths[m[2]] : sizeVal(m[2], m[1].includes('h') ? 'h' : 'w'); return val ? `${{ w: 'width', h: 'height', 'min-w': 'min-width', 'min-h': 'min-height', 'max-w': 'max-width', 'max-h': 'max-height' }[m[1]]}:${val}` : ''; }
  if ((m = base.match(/^rounded(?:-(sm|md|lg|xl|2xl|3xl|\[.*\]))?$/))) { const r = arbitrary(m[1]) || ({ sm: '.125rem', md: '.375rem', lg: '.5rem', xl: '.75rem', '2xl': '1rem', '3xl': '1.5rem' }[m[1]] || '.25rem'); return `border-radius:${r}`; }
  if ((m = base.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|\[.*\])$/))) return `font-size:${arbitrary(m[1]) || fontSizes[m[1]]}`;
  if ((m = base.match(/^tracking-(\[.*\])$/))) return `letter-spacing:${arbitrary(m[1])}`;
  if ((m = base.match(/^leading-(\d+)$/))) { val = spacing(m[1]); return val ? `line-height:${val}` : ''; }
  if ((m = base.match(/^line-clamp-(\d+)$/))) return `overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${m[1]}`;
  if ((m = base.match(/^ring-(\d+)$/))) return `--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 0 calc(${m[1]}px + 0px) var(--tw-ring-color,rgba(127,127,255,.2));box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)`;
  if ((m = base.match(/^divide-y(?:-(\d+))?$/))) return { child: `border-top-width:${m[1] || 1}px` };
  if ((m = base.match(/^shadow-(.+)$/))) { val = colorVal(m[1]); return val ? `--tw-shadow-color:${val};--tw-shadow:var(--tw-shadow-colored,0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color));box-shadow:var(--tw-shadow)` : ''; }
  if ((m = base.match(/^(from|via|to)-(.+)$/))) { val = colorVal(m[2]); if (!val) return ''; if (m[1] === 'from') return `--tw-gradient-from:${val};--tw-gradient-to:rgba(255,255,255,0);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)`; if (m[1] === 'via') return `--tw-gradient-stops:var(--tw-gradient-from),${val},var(--tw-gradient-to)`; return `--tw-gradient-to:${val}`; }
  if ((m = base.match(/^(bg|text|border|placeholder|accent|ring|divide)-(.+)$/))) { val = colorVal(m[2]); if (!val) return ''; return `${{ bg: 'background-color', text: 'color', border: 'border-color', placeholder: 'color', accent: 'accent-color', ring: '--tw-ring-color', divide: 'border-color' }[m[1]]}:${val}`; }
  if ((m = base.match(/^opacity-(\d+)$/))) return `opacity:${Number(m[1]) / 100}`;
  if ((m = base.match(/^scale-(\d+)$/))) return `--tw-scale-x:${Number(m[1]) / 100};--tw-scale-y:${Number(m[1]) / 100};transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))`;
  if ((m = base.match(/^(-?)translate-(x|y)-(.+)$/))) { val = spacing(m[3]) || fraction(m[3]); if (!val) return ''; if (m[1]) val = `-${val}`; return `--tw-translate-${m[2]}:${val};transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))`; }
  if ((m = base.match(/^space-y-(.+)$/))) { val = spacing(m[1]); return val ? { child: `margin-top:${val}` } : ''; }
  if ((m = base.match(/^space-x-(.+)$/))) { val = spacing(m[1]); return val ? { child: `margin-left:${val}` } : ''; }
  return '';
}
function makeRule(token) {
  if (!token || token.includes('${') || token.includes('`')) return '';
  const rawParts = token.split(':');
  const base = rawParts.pop();
  const d = decl(base);
  if (!d) return '';
  let selector = `.${esc(token)}`;
  let media = '';
  const pseudos = [];
  let important = '';
  for (const p of rawParts) {
    if (screens[p]) media = screens[p];
    else if (['hover', 'focus', 'focus-visible', 'active', 'disabled', 'enabled', 'visited', 'checked'].includes(p)) pseudos.push(`:${p}`);
    else if (p === 'selection') pseudos.push('::selection');
    else if (p === 'file') selector = `${selector}::file-selector-button`;
    else if (p === 'group-focus-within') selector = `.group:focus-within ${selector}`;
    else if (p === 'group-hover') selector = `.group:hover ${selector}`;
    else if (p === 'first') pseudos.push(':first-child');
    else if (p === 'last') pseudos.push(':last-child');
    else return '';
  }
  if (typeof d === 'object' && d.child) selector = `${selector}>:not([hidden])~:not([hidden])`;
  const body = typeof d === 'object' ? d.child : d;
  const rule = `${selector}${pseudos.join('')}{${body}${important}}`;
  return media ? `@media (min-width:${media}){${rule}}` : rule;
}
function extractTokens(text) {
  const tokens = new Set();
  const re = /[A-Za-z0-9_!:\/\.\-\[\]#%,()]+/g;
  for (const m of text.matchAll(re)) {
    const t = m[0].replace(/^['"`]+|['"`,;]+$/g, '');
    if (!t || t.length > 180 || t.includes('://')) continue;
    if (/^(class|id|src|href|const|let|function|return|true|false|null|undefined)$/.test(t)) continue;
    tokens.add(t);
  }
  return tokens;
}
function addSafelist(tokens) {
  const variants = ['', 'sm:', 'md:', 'lg:', 'xl:', 'hover:', 'focus:', 'focus-visible:', 'active:', 'disabled:', 'group-hover:'];
  const colorNames = Object.keys(colors);
  const opacities = ['5', '10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '85', '90', '95'];
  const utilities = [
    'hidden','block','inline-block','inline','flex','inline-flex','grid','relative','absolute','fixed','sticky','overflow-hidden','overflow-auto','overflow-y-auto','overflow-x-auto','object-cover','object-contain','rounded','rounded-sm','rounded-md','rounded-lg','rounded-xl','rounded-2xl','rounded-3xl','rounded-full','shadow','shadow-sm','shadow-md','shadow-lg','shadow-xl','shadow-2xl','border','border-0','border-2','border-t','border-b','w-full','h-full','min-h-screen','max-w-full','min-w-0','backdrop-blur','text-white','bg-white','bg-slate-50','bg-brand-500','bg-brand-600','text-slate-400','text-slate-500','text-slate-600','text-slate-700','text-slate-800','text-slate-900','bg-black/50'
  ];
  for (const u of utilities) for (const v of variants) tokens.add(v + u);
  for (const p of ['p','px','py','pt','pr','pb','pl','m','mx','my','mt','mr','mb','ml','gap','gap-x','gap-y','space-y','space-x']) for (const s of Object.keys(spacingScale)) for (const v of variants.slice(0, 5)) tokens.add(`${v}${p}-${s}`);
  for (const p of ['w','h','min-w','min-h','max-w','max-h']) for (const s of [...Object.keys(spacingScale), 'full', 'screen', '1/2', '1/3', '2/3', '1/4', '3/4']) for (const v of variants.slice(0, 5)) tokens.add(`${v}${p}-${s}`);
  for (const p of ['bg','text','border']) for (const c of colorNames) for (const v of variants.slice(0, 8)) tokens.add(`${v}${p}-${c}`);
  for (const p of ['bg','text','border']) for (const c of ['white','black','slate-900','brand-500','brand-600']) for (const o of opacities) for (const v of variants.slice(0, 8)) tokens.add(`${v}${p}-${c}/${o}`);
  for (let i = 1; i <= 12; i++) for (const v of variants.slice(0, 5)) { tokens.add(`${v}grid-cols-${i}`); tokens.add(`${v}col-span-${i}`); }
  for (const z of ['0','10','20','30','40','50','[60]','[70]','[80]','[100]','[1100]']) tokens.add(`z-${z}`);
}

const tokens = new Set();
const files = [...new Set(CONTENT_GLOBS.flatMap(filesForGlob))];
for (const file of files) for (const t of extractTokens(fs.readFileSync(file, 'utf8'))) tokens.add(t);
addSafelist(tokens);

const rules = [];
const seen = new Set();
for (const token of tokens) {
  const rule = makeRule(token);
  if (rule && !seen.has(rule)) { seen.add(rule); rules.push(rule); }
}

const css = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.5}}*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}::before,::after{--tw-content:''}html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4;font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}body{margin:0;line-height:inherit;background:#fff;color:#1f2937}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:1em}small{font-size:80%}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,[type='button'],[type='reset'],[type='submit']{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type='search']{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role='button']{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}:root{--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1}::selection{background-color:#7F7FFF;color:#fff}:focus:not(:focus-visible){outline:none;box-shadow:none}:focus-visible{outline:2px solid rgba(127,127,255,.75);outline-offset:2px}\n${rules.join('\n')}\n/* Stability overrides: keep public pages light while preserving purple for accents/buttons/states. */\nbody{background:#fff}\n.public-page,.page-shell,.sea-breeze-page,.projects-section,.footer,.footer-premium,.tab-content,main.flex-grow{background-color:#fff}\n#project-detail-modal-official>.glass-card,#property-detail-modal>.listing-detail-shell,.listing-submission-card,.glass-card{background-color:rgba(255,255,255,.96)}\n#project-detail-modal-official .bg-white,#project-detail-modal-official .bg-slate-50,#property-detail-modal .bg-white,#property-detail-modal .bg-slate-50{background-color:#fff}\n`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, css);
console.log(`Generated ${rules.length} utility rules from ${files.length} files into ${path.relative(ROOT, OUT)}`);
