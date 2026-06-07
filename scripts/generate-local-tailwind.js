const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
const classValues = [...html.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`$]+)["'`]/g)].flatMap(m => m[1].split(/\s+/));
const tokens = new Set(classValues.filter(Boolean));
const colors = {
  white:'#fff', black:'#000', transparent:'transparent', current:'currentColor',
  'gray-50':'#f9fafb','gray-100':'#f3f4f6','gray-200':'#e5e7eb','gray-300':'#d1d5db','gray-400':'#9ca3af','gray-500':'#6b7280','gray-600':'#4b5563','gray-700':'#374151','gray-800':'#1f2937','gray-900':'#111827','gray-950':'#030712',
  'slate-50':'#f8fafc','slate-100':'#f1f5f9','slate-200':'#e2e8f0','slate-300':'#cbd5e1','slate-400':'#94a3b8','slate-500':'#64748b','slate-600':'#475569','slate-700':'#334155','slate-800':'#1e293b','slate-900':'#0f172a','slate-950':'#020617',
  'red-50':'#fef2f2','red-100':'#fee2e2','red-200':'#fecaca','red-300':'#fca5a5','red-400':'#f87171','red-500':'#ef4444','red-600':'#dc2626','red-700':'#b91c1c','red-800':'#991b1b','red-900':'#7f1d1d',
  'green-50':'#f0fdf4','green-100':'#dcfce7','green-200':'#bbf7d0','green-300':'#86efac','green-400':'#4ade80','green-500':'#22c55e','green-600':'#16a34a','green-700':'#15803d','green-800':'#166534','green-900':'#14532d',
  'blue-50':'#eff6ff','blue-100':'#dbeafe','blue-200':'#bfdbfe','blue-300':'#93c5fd','blue-400':'#60a5fa','blue-500':'#3b82f6','blue-600':'#2563eb','blue-700':'#1d4ed8','blue-800':'#1e40af','blue-900':'#1e3a8a',
  'yellow-50':'#fefce8','yellow-100':'#fef9c3','yellow-200':'#fef08a','yellow-300':'#fde047','yellow-400':'#facc15','yellow-500':'#eab308','yellow-600':'#ca8a04','yellow-700':'#a16207','yellow-800':'#854d0e','yellow-900':'#713f12',
  'purple-50':'#faf5ff','purple-100':'#f3e8ff','purple-200':'#e9d5ff','purple-300':'#d8b4fe','purple-400':'#c084fc','purple-500':'#a855f7','purple-600':'#9333ea','purple-700':'#7e22ce','purple-800':'#6b21a8','purple-900':'#581c87',
  'pink-500':'#ec4899','indigo-50':'#eef2ff','indigo-100':'#e0e7ff','indigo-200':'#c7d2fe','indigo-500':'#6366f1','indigo-600':'#4f46e5','indigo-700':'#4338ca',
  'brand-50':'#EAEAFF','brand-100':'#EAEAFF','brand-200':'#CFCFFF','brand-300':'#B8B8FF','brand-500':'#7F7FFF','brand-600':'#6B6BFF','brand-700':'#5656E8','brand-900':'#34348F'
};
const screens = {sm:'640px', md:'768px', lg:'1024px', xl:'1280px', '2xl':'1536px'};
const spacing = n => `${Number(n)*0.25}rem`;
function esc(s){return s.replace(/([^a-zA-Z0-9_-])/g,'\\$1')}
function colorVal(v){
  const [name,op] = v.split('/'); const c=colors[name]; if(!c) return null;
  if(!op) return c; const a=op.startsWith('[')&&op.endsWith(']') ? Number(op.slice(1,-1)) : Number(op)/100; if(!Number.isFinite(a)) return c; if(c==='#fff') return `rgba(255,255,255,${a})`; if(c==='#000') return `rgba(0,0,0,${a})`;
  const m=c.match(/^#(..)(..)(..)$/); return m?`rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`:c;
}
function arbitrary(v){ return v.startsWith('[')&&v.endsWith(']') ? v.slice(1,-1).replace(/_/g,' ') : null; }
function decl(base){
  let m,a;
  const staticMap={
    hidden:'display:none', block:'display:block','inline-block':'display:inline-block',flex:'display:flex','inline-flex':'display:inline-flex',grid:'display:grid',contents:'display:contents',
    relative:'position:relative',absolute:'position:absolute',fixed:'position:fixed',sticky:'position:sticky',static:'position:static',
    'inset-0':'inset:0','inset-x-0':'left:0;right:0','inset-y-0':'top:0;bottom:0','top-0':'top:0','right-0':'right:0','bottom-0':'bottom:0','left-0':'left:0','top-1/2':'top:50%','left-1/2':'left:50%',
    'z-10':'z-index:10','z-20':'z-index:20','z-30':'z-index:30','z-40':'z-index:40','z-50':'z-index:50',
    'w-full':'width:100%','h-full':'height:100%','min-w-0':'min-width:0','max-w-full':'max-width:100%','max-h-full':'max-height:100%','min-h-screen':'min-height:100vh',
    'flex-1':'flex:1 1 0%','shrink-0':'flex-shrink:0','grow':'flex-grow:1','flex-col':'flex-direction:column','flex-row':'flex-direction:row','flex-wrap':'flex-wrap:wrap',
    'items-center':'align-items:center','items-start':'align-items:flex-start','items-end':'align-items:flex-end','justify-center':'justify-content:center','justify-between':'justify-content:space-between','justify-end':'justify-content:flex-end','justify-start':'justify-content:flex-start',
    'text-left':'text-align:left','text-center':'text-align:center','text-right':'text-align:right','uppercase':'text-transform:uppercase','lowercase':'text-transform:lowercase','capitalize':'text-transform:capitalize','truncate':'overflow:hidden;text-overflow:ellipsis;white-space:nowrap','whitespace-nowrap':'white-space:nowrap','overflow-hidden':'overflow:hidden','overflow-y-auto':'overflow-y:auto','overflow-x-auto':'overflow-x:auto',
    'object-cover':'object-fit:cover','object-contain':'object-fit:contain','object-center':'object-position:center','rounded-full':'border-radius:9999px','border':'border-width:1px','border-0':'border-width:0','border-t':'border-top-width:1px','border-b':'border-bottom-width:1px','border-l':'border-left-width:1px','border-r':'border-right-width:1px',
    shadow:'box-shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)','shadow-sm':'box-shadow:0 1px 2px rgba(0,0,0,.05)','shadow-lg':'box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)','shadow-xl':'box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)','shadow-2xl':'box-shadow:0 25px 50px -12px rgba(0,0,0,.25)',
    transition:'transition-property:all;transition-duration:150ms','duration-200':'transition-duration:200ms','duration-300':'transition-duration:300ms','duration-500':'transition-duration:500ms','cursor-pointer':'cursor:pointer','pointer-events-none':'pointer-events:none','pointer-events-auto':'pointer-events:auto','select-none':'user-select:none',
    'font-light':'font-weight:300','font-normal':'font-weight:400','font-medium':'font-weight:500','font-semibold':'font-weight:600','font-bold':'font-weight:700','font-extrabold':'font-weight:800','font-black':'font-weight:900',
    'leading-none':'line-height:1','leading-tight':'line-height:1.25','leading-snug':'line-height:1.375','leading-relaxed':'line-height:1.625','tracking-tight':'letter-spacing:-.025em','tracking-wide':'letter-spacing:.025em','tracking-widest':'letter-spacing:.1em',
    'mx-auto':'margin-left:auto;margin-right:auto','my-auto':'margin-top:auto;margin-bottom:auto','mt-auto':'margin-top:auto','ml-auto':'margin-left:auto','mr-auto':'margin-right:auto','aspect-square':'aspect-ratio:1 / 1','aspect-video':'aspect-ratio:16 / 9'
  };
  if(staticMap[base]) return staticMap[base];
  if((a=arbitrary(base.match(/^z-(\[.*\])$/)?.[1]||''))) return `z-index:${a}`;
  if((m=base.match(/^grid-cols-(\d+)$/))) return `grid-template-columns:repeat(${m[1]},minmax(0,1fr))`;
  if((a=arbitrary(base.match(/^grid-cols-(\[.*\])$/)?.[1]||''))) return `grid-template-columns:${a}`;
  if((m=base.match(/^(gap|gap-x|gap-y|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-([\d.]+)$/))){ const prop={gap:'gap','gap-x':'column-gap','gap-y':'row-gap',p:'padding',px:'padding-left:VAL;padding-right',py:'padding-top:VAL;padding-bottom',pt:'padding-top',pr:'padding-right',pb:'padding-bottom',pl:'padding-left',m:'margin',mx:'margin-left:VAL;margin-right',my:'margin-top:VAL;margin-bottom',mt:'margin-top',mr:'margin-right',mb:'margin-bottom',ml:'margin-left'}[m[1]]; const val=spacing(m[2]); return prop.includes('VAL')?prop.replace(/VAL/g,val)+`:${val}`:`${prop}:${val}`; }
  if((m=base.match(/^(w|h|min-h|min-w|max-w|max-h)-([\d.]+)$/))) return `${{w:'width',h:'height','min-h':'min-height','min-w':'min-width','max-w':'max-width','max-h':'max-height'}[m[1]]}:${spacing(m[2])}`;
  if((a=arbitrary(base.match(/^(w|h|min-h|max-w|max-h)-(.+)$/)?.[2]||''))) return `${{w:'width',h:'height','min-h':'min-height','max-w':'max-width','max-h':'max-height'}[base.split('-').slice(0,-1).join('-')]}:${a}`;
  if((m=base.match(/^max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/))) return `max-width:${{xs:'20rem',sm:'24rem',md:'28rem',lg:'32rem',xl:'36rem','2xl':'42rem','3xl':'48rem','4xl':'56rem','5xl':'64rem','6xl':'72rem','7xl':'80rem'}[m[1]]}`;
  if((m=base.match(/^rounded(?:-(sm|md|lg|xl|2xl|3xl|\[.*\]))?$/))){ const r=m[1]? (arbitrary(m[1])||{sm:'.125rem',md:'.375rem',lg:'.5rem',xl:'.75rem','2xl':'1rem','3xl':'1.5rem'}[m[1]]) : '.25rem'; return `border-radius:${r}`; }
  if((m=base.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|\[.*\])$/))) return `font-size:${arbitrary(m[1])||{xs:'.75rem',sm:'.875rem',base:'1rem',lg:'1.125rem',xl:'1.25rem','2xl':'1.5rem','3xl':'1.875rem','4xl':'2.25rem','5xl':'3rem','6xl':'3.75rem'}[m[1]]}`;
  if((m=base.match(/^(bg|text|border)-(.+)$/))){ const v=colorVal(m[2]); if(v) return `${{bg:'background-color',text:'color',border:'border-color'}[m[1]]}:${v}`; }
  if((m=base.match(/^opacity-(\d+)$/))) return `opacity:${Number(m[1])/100}`;
  if((m=base.match(/^(-?)translate-(x|y)-1\/2$/))) return `--tw-translate-${m[2]}:${m[1]?'-':''}50%;transform:translate(var(--tw-translate-x,0),var(--tw-translate-y,0)) rotate(var(--tw-rotate,0)) scale(var(--tw-scale-x,1),var(--tw-scale-y,1))`;
  if((m=base.match(/^(scale)-(\d+)$/))) return `--tw-scale-x:${Number(m[2])/100};--tw-scale-y:${Number(m[2])/100};transform:translate(var(--tw-translate-x,0),var(--tw-translate-y,0)) rotate(var(--tw-rotate,0)) scale(var(--tw-scale-x,1),var(--tw-scale-y,1))`;
  if((m=base.match(/^space-y-([\d.]+)$/))) return `--space-y:${spacing(m[1])}`;
  return '';
}
let css=`:root{--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-scale-x:1;--tw-scale-y:1}*{border-style:solid;border-width:0}html,body{background:#fff;color:#1f2937}body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.container{width:100%}.space-y-1>*+*{margin-top:.25rem}.space-y-1\\.5>*+*{margin-top:.375rem}.space-y-2>*+*{margin-top:.5rem}.space-y-3>*+*{margin-top:.75rem}.space-y-4>*+*{margin-top:1rem}.space-y-5>*+*{margin-top:1.25rem}.space-y-6>*+*{margin-top:1.5rem}.space-y-8>*+*{margin-top:2rem}.space-y-10>*+*{margin-top:2.5rem}.divide-y>*+*{border-top-width:1px}.selection\\:bg-brand-500::selection{background-color:#7F7FFF}.selection\\:text-white::selection{color:#fff}\n`;
const rules=[];
for(const t of tokens){
  const parts=t.split(':'); const base=parts.pop(); const d=decl(base); if(!d) continue;
  let selector='.'+esc(t); const pseudos=[]; let media='';
  let supported = true;
  for(const p of parts){
    if(screens[p]) media=screens[p];
    else if(['hover','focus','focus-visible','active','disabled'].includes(p)) pseudos.push(':'+p);
    else if(p==='selection') pseudos.push('::selection');
    else if(p==='group-hover') selector='.group:hover '+selector;
    else supported = false;
  }
  if(!supported) continue;
  const rule=`${selector}${pseudos.join('')}{${d}}`;
  rules.push(media?`@media (min-width:${media}){${rule}}`:rule);
}
css+=rules.join('\n')+'\n';
fs.mkdirSync('public/assets',{recursive:true});
fs.writeFileSync('public/assets/app.css', css);
console.log(`Generated ${rules.length} utility rules`);
