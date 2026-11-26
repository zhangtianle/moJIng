export function TitleLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center select-none">
      <svg
        viewBox="0 0 320 124"
        className={compact ? 'w-56 h-auto' : 'w-[270px] sm:w-[320px] h-auto'}
        role="img"
        aria-label="墨径 · 一笔通幽"
      >
        <defs>
          <linearGradient id="goldInkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6df9e" />
            <stop offset="52%" stopColor="#d9a74a" />
            <stop offset="100%" stopColor="#b98229" />
          </linearGradient>
          <linearGradient id="ivoryTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#faf6ee" />
            <stop offset="100%" stopColor="#dcd3be" />
          </linearGradient>
        </defs>

        {/* Subtle golden kintsugi seam arc threading behind the title */}
        <path
          d="M 24 88 C 66 86, 86 58, 126 62 C 168 66, 198 92, 248 80 C 272 74, 286 62, 298 54"
          fill="none"
          stroke="url(#goldInkGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="24" cy="88" r="3" fill="#e9c46a" opacity="0.7" />
        <circle cx="298" cy="54" r="3.5" fill="#e9c46a" opacity="0.85" />

        {/* Ornamental geometric celadon corner hairlines */}
        <path
          d="M 42 22 L 42 12 L 62 12 M 278 22 L 278 12 L 258 12"
          fill="none"
          stroke="#d9a74a"
          strokeWidth="1.2"
          opacity="0.45"
        />

        {/* Primary Display Title: 墨 径 */}
        <text
          x="138"
          y="78"
          textAnchor="middle"
          fill="url(#ivoryTextGrad)"
          fontFamily="'Noto Serif SC', 'Songti SC', serif"
          fontSize="60"
          fontWeight="700"
          letterSpacing="12"
        >
          墨径
        </text>

        {/* Vermilion Cinnabar Seal Stamp: 一笔 */}
        <g transform="translate(226, 26)">
          <rect
            x="0"
            y="0"
            width="30"
            height="54"
            rx="4"
            fill="#c94433"
            stroke="#e87a68"
            strokeWidth="1.2"
          />
          <rect
            x="3"
            y="3"
            width="24"
            height="48"
            rx="2"
            fill="none"
            stroke="#f5ddd6"
            strokeWidth="0.9"
            opacity="0.65"
          />
          <text
            x="15"
            y="24"
            textAnchor="middle"
            fill="#faf4ee"
            fontFamily="'Noto Serif SC', serif"
            fontSize="15"
            fontWeight="700"
          >
            一
          </text>
          <text
            x="15"
            y="43"
            textAnchor="middle"
            fill="#faf4ee"
            fontFamily="'Noto Serif SC', serif"
            fontSize="15"
            fontWeight="700"
          >
            笔
          </text>
        </g>

        {/* Subtitle line */}
        <text
          x="160"
          y="112"
          textAnchor="middle"
          fill="#c4d3cf"
          fontFamily="'Noto Sans SC', sans-serif"
          fontSize="13.5"
          fontWeight="500"
          letterSpacing="5"
        >
          一笔通幽 · 青瓷金缮解谜
        </text>
      </svg>
    </div>
  );
}
