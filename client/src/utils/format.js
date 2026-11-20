export const POINTS_PER_DOLLAR = 10;

export function formatDollars(amount) {
  const num = Number(amount || 0);
  const abs = Math.abs(num).toFixed(2);
  return num < 0 ? `-$${abs}` : `$${abs}`;
}

export function pointsToDollarsString(points) {
  return formatDollars(Number(points || 0) / POINTS_PER_DOLLAR);
}

export function getLocalToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

export function formatHumanDate(dateStr, todayStr) {
  if (!dateStr) return '';
  const yesterday = addDays(todayStr, -1);
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const formatted = dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: y !== new Date().getFullYear() ? 'numeric' : undefined
  });

  if (dateStr === todayStr) return `Today · ${formatted}`;
  if (dateStr === yesterday) return `Yesterday · ${formatted}`;
  return formatted;
}

export function getKidTheme(color) {
  if (color === 'rose') {
    return {
      gradient: 'from-rose-500 to-pink-600',
      softBg: 'bg-rose-50',
      softBorder: 'border-rose-200',
      activeBorder: 'border-rose-500',
      badge: 'bg-rose-100 text-rose-700',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
      btnOutline: 'border-rose-200 text-rose-700 hover:bg-rose-50',
      checkBg: 'bg-rose-600 border-rose-600 text-white',
      ring: 'ring-rose-500/20',
      hex: '#e11d48',
      lightHex: '#ffe4e6'
    };
  }
  if (color === 'emerald') {
    return {
      gradient: 'from-emerald-500 to-teal-600',
      softBg: 'bg-emerald-50',
      softBorder: 'border-emerald-200',
      activeBorder: 'border-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      btnOutline: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
      checkBg: 'bg-emerald-600 border-emerald-600 text-white',
      ring: 'ring-emerald-500/20',
      hex: '#059669',
      lightHex: '#d1fae5'
    };
  }
  if (color === 'violet') {
    return {
      gradient: 'from-violet-600 to-purple-600',
      softBg: 'bg-violet-50',
      softBorder: 'border-violet-200',
      activeBorder: 'border-violet-500',
      badge: 'bg-violet-100 text-violet-700',
      btn: 'bg-violet-600 hover:bg-violet-700 text-white',
      btnOutline: 'border-violet-200 text-violet-700 hover:bg-violet-50',
      checkBg: 'bg-violet-600 border-violet-600 text-white',
      ring: 'ring-violet-500/20',
      hex: '#7c3aed',
      lightHex: '#ede9fe'
    };
  }
  // default indigo
  return {
    gradient: 'from-indigo-600 to-blue-600',
    softBg: 'bg-indigo-50',
    softBorder: 'border-indigo-200',
    activeBorder: 'border-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    btnOutline: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
    checkBg: 'bg-indigo-600 border-indigo-600 text-white',
    ring: 'ring-indigo-500/20',
    hex: '#4f46e5',
    lightHex: '#e0e7ff'
  };
}
