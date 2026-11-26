import { PortalId } from '../game/types';

export function RockGlyph({ variant = 0 }: { variant?: number }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full p-2 text-[#233336]" aria-hidden="true">
      {variant % 2 === 0 ? (
        <g>
          <path
            d="M14 46 C11 36, 17 24, 28 19 C38 14, 49 20, 52 32 C55 42, 48 50, 34 51 C22 52, 16 50, 14 46 Z"
            fill="#141e21"
            stroke="#2a3e42"
            strokeWidth="1.5"
          />
          <path
            d="M20 38 C23 29, 32 24, 42 25"
            fill="none"
            stroke="#364f54"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="44" cy="42" r="2.2" fill="#3a5e54" opacity="0.7" />
        </g>
      ) : (
        <g>
          <path
            d="M16 48 C13 38, 22 25, 33 21 C44 17, 51 27, 50 39 C49 49, 41 52, 29 51 C21 50, 18 50, 16 48 Z"
            fill="#141e21"
            stroke="#2a3e42"
            strokeWidth="1.5"
          />
          {/* Minimalist bamboo leaf sprig */}
          <path
            d="M26 24 C29 17, 36 14, 42 15 C37 19, 31 22, 26 24 Z"
            fill="#345c52"
            opacity="0.75"
          />
          <path
            d="M24 27 C19 23, 16 19, 16 14 C21 17, 23 21, 24 27 Z"
            fill="#2b4e46"
            opacity="0.65"
          />
        </g>
      )}
    </svg>
  );
}

export function LotusEndGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" aria-hidden="true">
      <g
        fill={active ? '#58c9a4' : '#3d8f76'}
        stroke={active ? '#d8fff0' : '#7fd6ba'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {/* Center petal */}
        <path d="M32 14 C37 22, 39 31, 32 42 C25 31, 27 22, 32 14 Z" />
        {/* Left & right petals */}
        <path d="M32 42 C22 39, 16 32, 16 22 C23 25, 29 31, 32 42 Z" opacity="0.88" />
        <path d="M32 42 C42 39, 48 32, 48 22 C41 25, 35 31, 32 42 Z" opacity="0.88" />
        {/* Base rim */}
        <path
          d="M17 45 Q32 51 47 45"
          fill="none"
          stroke={active ? '#f1cf7a' : '#6cbca3'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fill={active ? '#11211d' : '#e6f7f1'}
        fontSize="12"
        fontWeight="700"
        fontFamily="'Noto Serif SC', serif"
      >
        终
      </text>
    </svg>
  );
}

export function BridgePlankGlyph({
  horizontalDone,
  verticalDone,
}: {
  horizontalDone: boolean;
  verticalDone: boolean;
}) {
  const remaining = (horizontalDone ? 0 : 1) + (verticalDone ? 0 : 1);
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      {/* Vertical under-channel rails */}
      <rect
        x="21"
        y="3"
        width="22"
        height="58"
        rx="3"
        fill={verticalDone ? 'rgba(217,167,74,0.18)' : 'rgba(15,24,27,0.52)'}
        stroke={verticalDone ? '#d9a74a' : '#4a6266'}
        strokeWidth="1.2"
      />
      {/* Horizontal elevated wooden bridge deck */}
      <rect
        x="3"
        y="20"
        width="58"
        height="24"
        rx="4"
        fill={horizontalDone ? '#5f4627' : '#493824'}
        stroke={horizontalDone ? '#e9c46a' : '#8a6b43'}
        strokeWidth="1.6"
      />
      {/* Wooden plank slats */}
      <line x1="14" y1="21" x2="14" y2="43" stroke="#2d2113" strokeWidth="1.2" opacity="0.7" />
      <line x1="25" y1="21" x2="25" y2="43" stroke="#2d2113" strokeWidth="1.2" opacity="0.7" />
      <line x1="39" y1="21" x2="39" y2="43" stroke="#2d2113" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="21" x2="50" y2="43" stroke="#2d2113" strokeWidth="1.2" opacity="0.7" />

      {/* Crossing status badge in corner (clear non-color-only state) */}
      <g transform="translate(44, 6)">
        <rect
          x="0"
          y="0"
          width="15"
          height="13"
          rx="3"
          fill={remaining === 0 ? '#2f7a62' : '#1b2b2f'}
          stroke={remaining === 0 ? '#78dfb9' : '#9eb2b6'}
          strokeWidth="1"
        />
        <text
          x="7.5"
          y="9.8"
          textAnchor="middle"
          fill="#f3efe6"
          fontSize="8.5"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          {remaining === 0 ? '✓' : `×${remaining}`}
        </text>
      </g>
    </svg>
  );
}

export function PortalGateGlyph({
  portalId,
  visited,
}: {
  portalId: PortalId;
  visited: boolean;
}) {
  const isA = portalId === 'A';
  const strokeMain = isA ? '#5cc8d7' : '#c993e8';
  const fillBg = isA ? 'rgba(42, 133, 148, 0.24)' : 'rgba(133, 86, 166, 0.24)';
  const label = isA ? '甲' : '乙';

  return (
    <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
      {/* Outer Moon Gate architectural ring */}
      <circle
        cx="32"
        cy="32"
        r="24"
        fill={visited ? 'rgba(217,167,74,0.22)' : fillBg}
        stroke={visited ? '#f1cf7a' : strokeMain}
        strokeWidth="2.2"
        strokeDasharray={isA ? 'none' : '5 3'}
      />
      <circle
        cx="32"
        cy="32"
        r="17"
        fill="none"
        stroke={visited ? '#f6df9e' : strokeMain}
        strokeWidth="1.1"
        opacity="0.7"
      />
      {/* Crescent moon ornament */}
      <path
        d="M32 10 A3 3 0 0 1 32 14"
        fill="none"
        stroke={strokeMain}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fill={visited ? '#fff4d2' : '#f3efe6'}
        fontSize="16"
        fontWeight="700"
        fontFamily="'Noto Serif SC', serif"
      >
        {label}
      </text>
    </svg>
  );
}

export function SealStarIcon({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 2.5 L14.8 8.3 L21.2 9.2 L16.5 13.7 L17.6 20 L12 17 L6.4 20 L7.5 13.7 L2.8 9.2 L9.2 8.3 Z"
        fill={filled ? '#e9c46a' : 'none'}
        stroke={filled ? '#f6df9e' : '#536b70'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
