interface LogoProps {
  className?: string
  width?: number | string
  height?: number | string
}

export default function Logo({ 
  className = 'block',
  width = 180,
  height = 40
}: LogoProps) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 180 40" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="易知 YiZhi Logo"
    >
      <defs>
        {/* 定义一个墨迹质感的滤镜（可选，如果追求极致性能可去掉 filter 属性） */}
        <filter id="ink-texture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
        </filter>
      </defs>

      {/* 图标部分：离卦演变 */}
      <g transform="translate(0, 2)">
        {/* 上爻：天/盖 - 厚重的墨块 */}
        <path 
          d="M2 8 C 2 5, 38 5, 38 8 C 38 12, 2 12, 2 8 Z" 
          fill="#1c1917" 
        />
        
        {/* 中爻：人/智 - 断开的连接与核心红点 */}
        <path d="M2 20 C 2 18, 14 18, 14 20 C 14 22, 2 22, 2 20 Z" fill="#1c1917" />
        <path d="M26 20 C 26 18, 38 18, 38 20 C 38 22, 26 22, 26 20 Z" fill="#1c1917" />
        
        {/* 核心：朱砂红点 (AI/灵感) - 带有微弱的光晕感 */}
        <circle cx="20" cy="20" r="4" fill="#C82E31">
          <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* 下爻：地/基 - 稳固的基石 */}
        <path 
          d="M2 32 C 2 29, 38 29, 38 32 C 38 36, 2 36, 2 32 Z" 
          fill="#1c1917" 
        />
      </g>

      {/* 文字部分 */}
      <g transform="translate(52, 0)">
        {/* 中文：易知 - 具有金石刻印感的定制字形结构 */}
        <text 
          x="0" 
          y="30" 
          fontFamily="'Noto Serif SC', 'Songti SC', serif" 
          fontWeight="900" 
          fontSize="28" 
          fill="#1c1917" 
          letterSpacing="2"
        >
          易知
        </text>
        
        {/* 英文：YIZHI AI - 极简现代科技感 */}
        <text 
          x="68" 
          y="18" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="600" 
          fontSize="9" 
          fill="#C82E31" 
          letterSpacing="1"
          opacity="0.8"
        >
          AI
        </text>
        <text 
          x="68" 
          y="29" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="500" 
          fontSize="9" 
          fill="#1c1917" 
          letterSpacing="1"
          opacity="0.4"
        >
          YIZHI
        </text>
      </g>
    </svg>
  )
}
