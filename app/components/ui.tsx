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
}: {
  children: React.ReactNode;
  kind?: string;
}) {
  const cls = kind ? `badge--${kind}` : '';
  return <span className={`badge ${cls}`}>{children}</span>;
}

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

