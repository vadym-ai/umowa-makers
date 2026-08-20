interface DocGenLogoProps {
  size?: 'sm' | 'lg';
}

export default function DocGenLogo({ size = 'sm' }: DocGenLogoProps) {
  const iconSize = size === 'lg' ? 40 : 24;
  const textSize = size === 'lg' ? 'text-3xl' : 'text-lg';

  return (
    <div className="flex items-center gap-2">
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="22" height="32" rx="3" fill="url(#doc-gradient)" />
        <path d="M22 4L28 10H25C23.3431 10 22 8.65685 22 7V4Z" fill="url(#corner-gradient)" opacity="0.6" />
        <rect x="11" y="16" width="12" height="2" rx="1" fill="white" opacity="0.8" />
        <rect x="11" y="21" width="10" height="2" rx="1" fill="white" opacity="0.6" />
        <rect x="11" y="26" width="8" height="2" rx="1" fill="white" opacity="0.4" />
        <defs>
          <linearGradient id="doc-gradient" x1="6" y1="4" x2="28" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818cf8" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="corner-gradient" x1="22" y1="4" x2="28" y2="10" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e0e7ff" />
            <stop offset="1" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`${textSize} font-bold tracking-tight`}>
        <span style={{ color: '#1e1b4b' }}>Doc</span>
        <span style={{ color: '#a855f7' }}>Gen</span>
      </span>
    </div>
  );
}
