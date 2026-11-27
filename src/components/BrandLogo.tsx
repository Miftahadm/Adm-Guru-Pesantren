import React, { useState } from 'react';

interface BrandLogoProps {
  logoDataUrl: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-14 h-14 rounded-2xl',
  xl: 'w-20 h-20 rounded-2xl',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoDataUrl,
  alt = 'Logo Pesantren Trubus Iman',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (logoDataUrl && !imgError) {
    return (
      <img
        src={logoDataUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${SIZE_MAP[size]} object-cover bg-white border border-slate-200/80 shrink-0 ${className}`}
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
        <circle cx="32" cy="11.5" r="1.8" fill="#FDE68A" />
        <path d="M15 31C15 29.5 16.2 28.5 17.5 28.5H28C30.2 28.5 32 30.3 32 32.5V47C32 45.2 30.2 44 28 44H17.5C16.2 44 15 43 15 41.5V31Z" fill="#FFFFFF" />
        <path d="M49 31C49 29.5 47.8 28.5 46.5 28.5H36C33.8 28.5 32 30.3 32 32.5V47C32 45.2 33.8 44 36 44H46.5C47.8 44 49 43 49 41.5V31Z" fill="#ECFDF5" />
        <path d="M19 34H27M19 38H27M37 34H45M37 38H45" stroke="#065F46" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 50H49" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
