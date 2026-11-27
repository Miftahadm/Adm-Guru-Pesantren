import React, { useEffect, useState } from 'react';

export const DEFAULT_LOGO_LOCAL = '/logo-trubus-iman.png';
export const DEFAULT_LOGO_REMOTE =
  'https://trubusiman.sch.id/wp-content/uploads/2023/02/Desain-tanpa-judul.png';

interface BrandLogoProps {
  logoDataUrl: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 rounded-lg p-0.5',
  md: 'w-10 h-10 rounded-xl p-0.5',
  lg: 'w-14 h-14 rounded-2xl p-1',
  xl: 'w-20 h-20 rounded-2xl p-1.5',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoDataUrl,
  alt = 'Logo Pesantren Trubus Iman',
  size = 'md',
  className = '',
}) => {
  // 0 = primary (custom or bundled local official logo), 1 = remote official URL, 2 = vector fallback
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setStage(0);
  }, [logoDataUrl]);

  const src =
    stage === 0
      ? logoDataUrl || DEFAULT_LOGO_LOCAL
      : stage === 1
        ? DEFAULT_LOGO_REMOTE
        : null;

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setStage((prev) => (prev < 2 ? ((prev + 1) as 1 | 2) : 2))}
        className={`${SIZE_MAP[size]} object-contain bg-white border border-slate-200/80 shrink-0 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZE_MAP[size]} bg-emerald-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}
      aria-label={alt}
    >
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <rect width="64" height="64" fill="#065F46" />
        <rect x="4" y="4" width="56" height="56" rx="10" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M32 14C26 19 22.5 22.5 22.5 27.5H41.5C41.5 22.5 38 19 32 14Z" fill="#F59E0B" />
        <path d="M15 31C15 29.5 16.2 28.5 17.5 28.5H28C30.2 28.5 32 30.3 32 32.5V47C32 45.2 30.2 44 28 44H17.5C16.2 44 15 43 15 41.5V31Z" fill="#FFFFFF" />
        <path d="M49 31C49 29.5 47.8 28.5 46.5 28.5H36C33.8 28.5 32 30.3 32 32.5V47C32 45.2 33.8 44 36 44H46.5C47.8 44 49 43 49 41.5V31Z" fill="#ECFDF5" />
      </svg>
    </div>
  );
};
