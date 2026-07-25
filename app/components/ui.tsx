'use client';

import { useEffect, useRef, useState } from 'react';
import { fmtPct, shortAddr } from '@/lib/format';

/* Truncated monospace wallet address with copy + explorer link. */
export function Address({
  address,
  explorerUrl,
  full = false,
}: {
  address: string;
  explorerUrl?: string;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };
  const href = explorerUrl
    ? `${explorerUrl.replace(/\/$/, '')}/address/${address}`
    : undefined;
  return (
    <span className="addr">
      <button
        type="button"
        className="addr-copy"
        onClick={copy}
        title={address}
      >
        {copied ? 'copied!' : full ? address : shortAddr(address)}
      </button>
      {href && (
        <a
          className="addr-link"
          href={href}
          target="_blank"
          rel="noreferrer"
          title="View on explorer"
          onClick={(e) => e.stopPropagation()}
        >
          ↗
        </a>
      )}
    </span>
  );
}

/* Muted em-dash placeholder for values we genuinely don't have. */
export function Dash() {
  return <span style={{ color: 'var(--muted-2)' }}>—</span>;
}

/* One cell of a token-card stat grid (label over value). */
export function CardStat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="tcs-label">{label}</div>
      <div className="tcs-value">{children}</div>
    </div>
  );
}

/* Compact "copy contract address" chip for token/stock cards.
   Shows a truncated address; click copies the full address and flashes "copied".
   stopPropagation so the card's own click (open detail) doesn't fire. */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      className="addr-copy"
      onClick={copy}
      title={`Copy contract address ${address}`}
    >
      {copied ? '✓ copied' : `${shortAddr(address)} ⧉`}
    </button>
  );
}

export function Delta({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(value))
    return <span className="delta delta--flat">—</span>;
  const cls =
    value > 0 ? 'delta--up' : value < 0 ? 'delta--down' : 'delta--flat';
  return <span className={`delta ${cls}`}>{fmtPct(value)}</span>;
}

/* Briefly flashes when `track` changes between renders (data refresh). */
export function useFlashClass(track: string | number): string {
  const prev = useRef<string | number | undefined>(undefined);
  const [cls, setCls] = useState('');
  useEffect(() => {
    if (prev.current !== undefined && prev.current !== track) {
      setCls('flash');
      const id = setTimeout(() => setCls(''), 650);
      prev.current = track;
      return () => clearTimeout(id);
    }
    prev.current = track;
    return undefined;
  }, [track]);
  return cls;
}

/* Wraps a value; flashes its background on change without layout shift. */
export function Flash({
  track,
  children,
  className = '',
}: {
  track: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = useFlashClass(track);
  return (
    <span
      className={`${cls} ${className}`}
      style={{
        display: 'inline-block',
        padding: '1px 4px',
        margin: '-1px -4px',
        borderRadius: 4,
      }}
    >
      {children}
    </span>
  );
}

/* Category/scope badge. */
export function Badge({
  children,
  kind,
  title,
}: {
  children: React.ReactNode;
  kind?: string;
  title?: string;
}) {
  const cls = kind ? `badge--${kind}` : '';
  return (
    <span
      className={`badge ${cls}`}
      title={title}
      style={title ? { cursor: 'help' } : undefined}
    >
      {children}
    </span>
  );
}

/* Shared explanation for the `capped` wallet flag (source indexer undercounts). */
export const CAPPED_TOOLTIP =
  'Volume & trades may be understated — the source indexer stops at a per-wallet limit, so these figures are partial (a lower bound), not a full total.';

/* Colored glyph avatar. */
export function Avatar({
  glyph,
  bg,
  size = 'sm',
}: {
  glyph?: string;
  bg?: string[];
  size?: 'sm' | 'lg';
}) {
  const style: React.CSSProperties = {};
  if (bg && bg.length >= 2) {
    style.background = `linear-gradient(135deg, ${bg[0]}, ${bg[1]})`;
  } else if (bg && bg.length === 1) {
    style.background = bg[0];
  } else {
    style.background = 'var(--panel-3)';
  }
  return (
    <span className={`avatar ${size === 'lg' ? 'avatar--lg' : ''}`} style={style}>
      {glyph ?? '?'}
    </span>
  );
}

/* Token logo <img> with initials fallback. */
export function TokenLogo({
  url,
  symbol,
  size = 24,
}: {
  url?: string | null;
  symbol?: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  const initial =
    (symbol || '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  if (!url || err) {
    return (
      <span
        className="holding-logo-ph"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={symbol || ''}
      width={size}
      height={size}
      className="holding-logo"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}

export function Skeleton({ w, h }: { w?: number | string; h?: number | string }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'inline-block', width: w, height: h ?? 12 }}
    />
  );
}

export function ExplorerTxLink({
  txHash,
  explorerUrl,
}: {
  txHash: string;
  explorerUrl: string;
}) {
  return (
    <a
      className="addr-link mono"
      href={`${explorerUrl.replace(/\/$/, '')}/tx/${txHash}`}
      target="_blank"
      rel="noreferrer"
      title={txHash}
    >
      tx↗
    </a>
  );
}

/* Share / deep-link helpers */

export function currentUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

export function tweetIntent(text: string, url: string) {
  const u = new URL('https://twitter.com/intent/tweet');
  u.searchParams.set('text', text);
  if (url) u.searchParams.set('url', url);
  window.open(u.toString(), '_blank', 'noopener,noreferrer');
}

export function ShareButton({
  text,
  label = 'Share',
}: {
  text: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => tweetIntent(text, currentUrl())}
      title="Share on X / Twitter"
    >
      𝕏 {label}
    </button>
  );
}

