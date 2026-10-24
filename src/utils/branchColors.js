// Fixed brand colors per branch (team request, CRM fixes PDF):
// Hera blue · Ai Skin nude pink · Lumia purple · Geneva red · TBF turquoise ·
// Venice green · Paris beige · Feliz light blue · Sta Lucia gold · Estancia dark grey.
// Branches without an assigned brand color fall back to a stable palette.
export const BRANCH_COLOR_MAP = {
  'HERA':      '#2563eb', // blue
  'AI SKIN':   '#e8b4b8', // nude pink
  'LUMIA':     '#8b5cf6', // purple
  'GENEVA':    '#dc2626', // red
  'TBF':       '#14b8a6', // turquoise
  'VENICE':    '#16a34a', // green
  'PARIS':     '#d4b896', // beige
  'FELIZ':     '#7dd3fc', // light blue
  'STA LUCIA': '#d4a017', // gold
  'ESTANCIA':  '#374151', // dark grey
};

const FALLBACK_COLORS = [
  '#ec4899', '#f97316', '#a16207', '#06b6d4', '#84cc16',
  '#6366f1', '#f43f5e', '#0ea5e9', '#a78bfa', '#fbbf24',
];

export function branchColor(branch, idx = 0) {
  const key = String(branch || '').trim().toUpperCase();
  return BRANCH_COLOR_MAP[key] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}
