import React from 'react';

interface LogoMarkProps {
    className?: string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ className = 'h-10 w-10' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        className={className}
        aria-hidden="true"
        focusable="false"
        role="img"
    >
        <defs>
            <linearGradient id="mn-tk1-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2dd4bf" />
                <stop offset="1" stopColor="#0d9488" />
            </linearGradient>
        </defs>
        <rect width="512" height="512" rx="120" fill="url(#mn-tk1-bg)" />
        <circle cx="150" cy="120" r="190" fill="#ffffff" opacity="0.08" />

        {/* Sun */}
        <g transform="translate(392 128)" stroke="#fde68a" strokeWidth="15" strokeLinecap="round">
            <line x1="0" y1="-80" x2="0" y2="-106" />
            <line x1="0" y1="80" x2="0" y2="106" />
            <line x1="-80" y1="0" x2="-106" y2="0" />
            <line x1="80" y1="0" x2="106" y2="0" />
            <line x1="-57" y1="-57" x2="-75" y2="-75" />
            <line x1="57" y1="-57" x2="75" y2="-75" />
            <line x1="-57" y1="57" x2="-75" y2="75" />
            <line x1="57" y1="57" x2="75" y2="75" />
        </g>
        <circle cx="392" cy="128" r="50" fill="#fde68a" />
        <circle cx="392" cy="128" r="34" fill="#fbbf24" />

        {/* Sparkles */}
        <g fill="#fef3c7">
            <path d="M96 180 l6 12 12 2 -9 10 2 13 -11 -6 -11 6 2 -13 -9 -10 12 -2 z" />
            <path d="M164 96 l5 10 10 2 -8 8 2 11 -9 -5 -9 5 2 -11 -8 -8 10 -2 z" opacity="0.8" />
            <path d="M66 264 l4 8 8 1 -6 6 2 9 -8 -4 -8 4 2 -9 -6 -6 8 -1 z" opacity="0.7" />
        </g>

        {/* Steam */}
        <g stroke="#ffffff" strokeWidth="13" fill="none" strokeLinecap="round" opacity="0.95">
            <path d="M222 262 q-12 -24 10 -44 q16 -16 4 -38" />
            <path d="M292 262 q12 -24 -10 -44 q-16 -16 -4 -38" />
            <path d="M257 246 q8 -18 -6 -32" opacity="0.8" />
        </g>

        {/* Bowl */}
        <path d="M104 322 a152 110 0 0 0 304 0 z" fill="#ffffff" />
        <ellipse cx="256" cy="322" rx="112" ry="30" fill="#99f6e4" />
        <ellipse cx="256" cy="322" rx="152" ry="32" fill="none" stroke="#f0fdfa" strokeWidth="10" />

        {/* Friendly face */}
        <g fill="#0f766e">
            <circle cx="210" cy="330" r="10" />
            <circle cx="302" cy="330" r="10" />
        </g>
        <path d="M224 354 q32 24 64 0" fill="none" stroke="#0f766e" strokeWidth="9" strokeLinecap="round" />
    </svg>
);

interface LogoProps {
    compact?: boolean;
}

const Logo: React.FC<LogoProps> = ({ compact = false }) => (
    <div className="flex items-center space-x-3">
        <LogoMark className={compact ? 'h-9 w-9' : 'h-10 w-10'} />
        <span className={`font-bold text-gray-800 dark:text-gray-100 ${compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}>
            Mầm non Tam Kỳ 1
        </span>
    </div>
);

export default Logo;