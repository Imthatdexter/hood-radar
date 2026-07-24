// Number / address / time formatting helpers.

export function fmtUsd(
  n: number | null | undefined,
  opts?: { compact?: boolean; decimals?: number },
): string {
  if (n == null || Number.isNaN(n)) return '—';
  const compact = opts?.compact ?? true;
  const abs = Math.abs(n);
  if (compact && abs >= 1000) {
    const units = [
      { v: 1e9, s: 'B' },
      { v: 1e6, s: 'M' },
      { v: 1e3, s: 'K' },
    ];
    for (const u of units) {
      if (abs >= u.v) {
        const d = abs >= u.v * 100 ? 1 : 2;
        return '$' + trimZero((n / u.v).toFixed(d)) + u.s;
      }
    }
  }
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: opts?.decimals ?? 2 });
}

export function fmtNum(
  n: number | null | undefined,
  compact = true,
): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (compact && abs >= 1000) {
    const units = [
      { v: 1e9, s: 'B' },
      { v: 1e6, s: 'M' },
      { v: 1e3, s: 'K' },
    ];
    for (const u of units) {
      if (abs >= u.v) {
        const d = abs >= u.v * 100 ? 1 : 2;
        return trimZero((n / u.v).toFixed(d)) + u.s;
      }
    }
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function trimZero(s: string): string {
  return s.replace(/\.0+$/, '');
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return '';
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/* USD price with precision tuned to magnitude (stocks get 2dp, sub-cent tokens get more). */
export function fmtPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n) || n === 0) return '—';
  const abs = Math.abs(n);
  const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function timeOfDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export function ageSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 1000));
}
