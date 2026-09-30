import React from 'react';

interface OrbitLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const OrbitLogo: React.FC<OrbitLogoProps> = ({ size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  return (
    <div className="flex items-center gap-2.5 select-none group">
      <div className={`relative ${iconSizes[size]} flex items-center justify-center`}>
        {/* Orbital Ellipses */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-cyan-400 group-hover:text-cyan-300 transition-colors"
        >
          {/* Inner orbit ring */}
          <ellipse
            cx="16"
            cy="16"
            rx="12"
            ry="4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            className="opacity-40"
            transform="rotate(-25 16 16)"
          />
          {/* Outer primary orbit ring */}
          <ellipse
            cx="16"
            cy="16"
            rx="14"
            ry="7.5"
            stroke="currentColor"
            strokeWidth="1.75"
            transform="rotate(35 16 16)"
          />
          {/* Central signal core */}
          <circle cx="16" cy="16" r="3" fill="currentColor" />
          {/* Satellite node in orbit */}
          <circle cx="26" cy="11" r="1.75" fill="#38bdf8" />
          <circle cx="6" cy="21" r="1.25" fill="#0ea5e9" className="opacity-75" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-[15px] font-bold tracking-tight text-white">REDDIT</span>
            <span className="text-[15px] font-semibold tracking-wider text-cyan-400">ORBIT</span>
          </div>
        </div>
      )}
    </div>
  );
};
