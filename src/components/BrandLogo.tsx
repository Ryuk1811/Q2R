import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  const iconDimensions = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
  }[size];

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Precision Vector Emblem */}
      <div
        className={`${iconDimensions} shrink-0 rounded-lg bg-[#1A1C1A] flex items-center justify-center p-1 shadow-2xs border border-stone-800 transition-transform duration-200 hover:scale-105`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Top-left QR Finder Pattern (Emphasizing QR) */}
          <rect
            x="4"
            y="4"
            width="10"
            height="10"
            rx="2.5"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <rect x="7" y="7" width="4" height="4" rx="1" fill="#C88D77" />

          {/* Directional "2" Quick-Redirect Vector Bridge */}
          <path
            d="M18 6.5C18 5.1 19.1 4 20.5 4C21.9 4 23 5.1 23 6.5C23 8.5 18 12 18 13.5H24"
            stroke="#C88D77"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Letters Q & R */}
          <path
            d="M9 19C6.8 19 5 20.8 5 23C5 25.2 6.8 27 9 27C11.2 27 13 25.2 13 23C13 20.8 11.2 19 9 19Z"
            stroke="#FFFFFF"
            strokeWidth="1.75"
          />
          <path
            d="M11.5 25.5L14 28"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Letter R */}
          <path
            d="M19 19V28M19 19H22.5C23.9 19 25 20.1 25 21.5C25 22.9 23.9 24 22.5 24H19M22 24L25.5 28"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Stylized Brand Typographic Lockup */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className={`${titleSizes} font-black tracking-tight text-stone-900 font-sans`}>
            <span>Q</span>
            <span className="text-[#C88D77] mx-0.5">2</span>
            <span>R</span>
          </span>
          {showSubtitle && (
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold text-stone-500 tracking-wider">
              [<span className="font-bold text-stone-800">QR</span> Studio]
            </span>
          )}
        </div>

        {showSubtitle && (
          <span
            className={`${subSizes} font-medium text-stone-600 tracking-wide mt-0.5 whitespace-nowrap`}
          >
            <strong className="font-bold text-stone-900">Q</strong>uick{' '}
            <span className="text-[#C88D77] font-semibold">2</span>{' '}
            <strong className="font-bold text-stone-900">R</strong>edirect
          </span>
        )}
      </div>
    </div>
  );
};
