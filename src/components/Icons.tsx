import type { CSSProperties, ReactElement } from 'react';

export type IconName =
  | 'search'
  | 'close'
  | 'settings'
  | 'play'
  | 'pause'
  | 'expand'
  | 'collapse'
  | 'shuffle'
  | 'info'
  | 'compare'
  | 'orbit'
  | 'arrow'
  | 'reset'
  | 'help'
  | 'chevron'
  | 'sparkle'
  | 'layers'
  | 'sun'
  | 'camera'
  | 'list'
  | 'globe';

const PATHS: Record<IconName, ReactElement> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.2 4.2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" strokeWidth="2.4" />
    </>
  ),
  expand: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  collapse: <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />,
  shuffle: (
    <>
      <path d="M3 7h3.2c1.4 0 2.7.7 3.5 1.9l5 7.2c.8 1.2 2.1 1.9 3.5 1.9H21" />
      <path d="M3 17h3.2c1.4 0 2.7-.7 3.5-1.9l1-1.4M14.2 9.3l1-1.4C16 6.7 17.3 6 18.7 6H21" />
      <path d="M18 3.5L21 6l-3 2.5M18 15.5L21 18l-3 2.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.2" />
    </>
  ),
  compare: (
    <>
      <rect x="3.5" y="5" width="7" height="14" rx="1.4" />
      <rect x="13.5" y="5" width="7" height="14" rx="1.4" />
      <path d="M7 9h0M17 15h0" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9" ry="4.6" transform="rotate(-24 12 12)" />
      <circle cx="19.4" cy="7.6" r="1.2" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  reset: (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v4.6h4.6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.4a2.6 2.6 0 1 1 3.2 2.6c-.5.2-.7.6-.7 1.1v.4M12 16.7v.2" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  sparkle: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  layers: (
    <>
      <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6z" />
      <path d="M3.5 12.4L12 17l8.5-4.6M3.5 16.8L12 21.4l8.5-4.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z" />
      <circle cx="12" cy="13.2" r="3" />
    </>
  ),
  list: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
      <circle cx="2.2" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {PATHS[name]}
    </svg>
  );
}
