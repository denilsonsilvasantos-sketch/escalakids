// Maps a function's name/category to a small icon, shown both on the site
// (via FUNCTION_ICON_KEY -> a real lucide-react component, e.g. in
// MicroManagement/MacroScheduleView/MicroScheduleView) and in the exported
// PDF (via FUNCTION_ICON_NODES, rasterized to a PNG since jsPDF's standard
// fonts can't render icon glyphs — see exportService.ts).

export type FunctionIconKey =
  | 'mic'
  | 'guitar'
  | 'piano'
  | 'drum'
  | 'volume'
  | 'graduation'
  | 'users'
  | 'popcorn'
  | 'shield'
  | 'camera'
  | 'heart'
  | 'drama'
  | 'utensils'
  | 'crown'
  | 'star'
  | 'music';

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Order matters — first matching rule wins, so more specific keywords should
// come before broader ones.
const KEYWORD_RULES: [FunctionIconKey, string[]][] = [
  ['star', ['participacao especial', 'convidado']],
  ['mic', ['vocal', 'ministro', 'voz', 'cantor']],
  ['piano', ['teclado', 'piano']],
  ['guitar', ['violao', 'guitarra', 'baixo']],
  ['drum', ['cajon', 'bateria', 'percussao']],
  ['volume', ['mesa de som', 'tecnica', 'audio', ' som']],
  ['graduation', ['professor', 'sala', 'aula', 'ensino']],
  ['popcorn', ['pipoca']],
  ['shield', ['seguranca']],
  ['camera', ['midia', 'foto', 'video', 'transmissao']],
  ['heart', ['acolhimento', 'recepcao']],
  ['drama', ['teatro', 'expressao', 'dramatiza']],
  ['utensils', ['refeitorio', 'lanche', 'cozinha']],
  ['crown', ['lideranca', 'coordenacao', 'coordenador']],
  ['users', ['auxiliar']]
];

export function getFunctionIconKey(input: { name: string; category?: string }): FunctionIconKey {
  const haystack = ` ${normalize(`${input.name} ${input.category || ''}`)} `;
  for (const [key, keywords] of KEYWORD_RULES) {
    if (keywords.some((k) => haystack.includes(k))) return key;
  }
  return 'music';
}

// Raw path/shape data for each icon, one-for-one with the matching lucide-react
// icon (Mic, Piano, Guitar, Drum, Volume2, GraduationCap, Popcorn, ShieldCheck,
// Camera, HeartHandshake, Drama, UtensilsCrossed, Crown, Star, Users, Music2)
// on a 24x24 viewBox, stroke-based like the rest of the icon set. Kept as
// static data (not imported from lucide-react's internals at runtime) so a
// future lucide-react upgrade can't silently break PDF export.
export const FUNCTION_ICON_NODES: Record<FunctionIconKey, [string, Record<string, string>][]> = {
  mic: [
    ['path', { d: 'M12 19v3' }],
    ['path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }],
    ['rect', { x: '9', y: '2', width: '6', height: '13', rx: '3' }]
  ],
  guitar: [
    ['path', { d: 'm11.9 12.1 4.514-4.514' }],
    ['path', { d: 'M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z' }],
    ['path', { d: 'm6 16 2 2' }],
    ['path', { d: 'M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z' }]
  ],
  piano: [
    ['path', { d: 'M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8' }],
    ['path', { d: 'M2 14h20' }],
    ['path', { d: 'M6 14v4' }],
    ['path', { d: 'M10 14v4' }],
    ['path', { d: 'M14 14v4' }],
    ['path', { d: 'M18 14v4' }]
  ],
  drum: [
    ['path', { d: 'm2 2 8 8' }],
    ['path', { d: 'm22 2-8 8' }],
    ['ellipse', { cx: '12', cy: '9', rx: '10', ry: '5' }],
    ['path', { d: 'M7 13.4v7.9' }],
    ['path', { d: 'M12 14v8' }],
    ['path', { d: 'M17 13.4v7.9' }],
    ['path', { d: 'M2 9v8a10 5 0 0 0 20 0V9' }]
  ],
  volume: [
    ['path', { d: 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z' }],
    ['path', { d: 'M16 9a5 5 0 0 1 0 6' }],
    ['path', { d: 'M19.364 18.364a9 9 0 0 0 0-12.728' }]
  ],
  graduation: [
    ['path', { d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z' }],
    ['path', { d: 'M22 10v6' }],
    ['path', { d: 'M6 12.5V16a6 3 0 0 0 12 0v-3.5' }]
  ],
  users: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['path', { d: 'M16 3.128a4 4 0 0 1 0 7.744' }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['circle', { cx: '9', cy: '7', r: '4' }]
  ],
  popcorn: [
    ['path', { d: 'M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4' }],
    ['path', { d: 'M10 22 9 8' }],
    ['path', { d: 'm14 22 1-14' }],
    ['path', { d: 'M20 8c.5 0 .9.4.8 1l-2.6 12c-.1.5-.7 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L3.2 9c-.1-.6.3-1 .8-1Z' }]
  ],
  shield: [
    ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ],
  camera: [
    ['path', { d: 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z' }],
    ['circle', { cx: '12', cy: '13', r: '3' }]
  ],
  heart: [
    ['path', { d: 'M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762' }]
  ],
  drama: [
    ['path', { d: 'M10 11h.01' }],
    ['path', { d: 'M14 6h.01' }],
    ['path', { d: 'M18 6h.01' }],
    ['path', { d: 'M6.5 13.1h.01' }],
    ['path', { d: 'M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3' }],
    ['path', { d: 'M17.4 9.9c-.8.8-2 .8-2.8 0' }],
    ['path', { d: 'M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7' }],
    ['path', { d: 'M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4' }]
  ],
  utensils: [
    ['path', { d: 'm16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8' }],
    ['path', { d: 'M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7' }],
    ['path', { d: 'm2.1 21.8 6.4-6.3' }],
    ['path', { d: 'm19 5-7 7' }]
  ],
  crown: [
    ['path', { d: 'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z' }],
    ['path', { d: 'M5 21h14' }]
  ],
  star: [
    ['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }]
  ],
  music: [
    ['circle', { cx: '8', cy: '18', r: '4' }],
    ['path', { d: 'M12 18V2l7 4' }]
  ]
};

export function buildIconSvgString(key: FunctionIconKey, color = '#1e293b', strokeWidth = 2.2): string {
  const body = FUNCTION_ICON_NODES[key]
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${attrStr} />`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
