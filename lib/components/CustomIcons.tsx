
// --- 自定义图标 ---
export const IconLuoPan = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
    <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 10L13.5 14H10.5L12 10Z" fill="currentColor" />
  </svg>
)

export const IconHulu = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* 渐变定义：从墨色到朱砂红 */}
      <linearGradient id="yizhi-gradient-stroke" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1c1917" /> {/* 墨黑 */}
        <stop offset="50%" stopColor="#57534e" /> {/* 过渡灰 */}
        <stop offset="100%" stopColor="#C82E31" /> {/* 朱砂红 */}
      </linearGradient>
      
      {/* 智慧点渐变：从红到金 */}
      <linearGradient id="yizhi-gradient-dot" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C82E31" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* 头部轮廓：双丫髻 + 脸庞 */}
    <path 
      d="M8 8.5C7.2 7.5 6.5 6.5 7 5C7.5 3.5 9 3.5 10 4.5C10.5 5 11 6 11 6" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M16 8.5C16.8 7.5 17.5 6.5 17 5C16.5 3.5 15 3.5 14 4.5C13.5 5 13 6 13 6" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    {/* 脸部轮廓连接 */}
    <path 
      d="M11 6C11.5 6 12.5 6 13 6" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
    <path 
      d="M8 8.5C8 11 9.5 13 12 13C14.5 13 16 11 16 8.5" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />

    {/* 身体：交领汉服 */}
    <path 
      d="M6.5 21C6.5 17 8.5 14.5 12 14.5C15.5 14.5 17.5 17 17.5 21" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
    {/* 交领细节 (y字形) */}
    <path 
      d="M12 14.5V16L9.5 18.5" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 16L14.5 18.5" 
      stroke="url(#yizhi-gradient-stroke)" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />

    {/* 眉心智慧点 (AI Core) */}
    <circle 
      cx="12" 
      cy="9.5" 
      r="1" 
      fill="url(#yizhi-gradient-dot)" 
    />
  </svg>
)

// --- 主菜单自定义图标（新中式、厚重感、金石墨韵风格）---
// 1. 首页：【门户】 - 众妙之门，沉稳基石
export const IconHome = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 屋顶：飞檐造型 */}
    <path d="M12 3L2 9V11H22V9L12 3Z" />
    {/* 门柱与台基：厚重的墨块 */}
    <path d="M5 12H9V19H15V12H19V21H5V12Z" />
    {/* 中心点：灵光/聚焦 */}
    <circle cx="12" cy="14.5" r="1.5" className="text-[#C82E31]" fill="currentColor" />
  </svg>
)

// 2. 社区：【拱手/回纹】 - 交流互动，生生不息
export const IconCommunity = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 左侧人形/气泡 */}
    <path d="M4 12C4 7.58172 7.58172 4 12 4H14V7H12C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17V20C7.58172 20 4 16.4183 4 12Z" />
    {/* 右侧人形/气泡 - 呼应 */}
    <path d="M20 12C20 16.4183 16.4183 20 12 20H10V17H12C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7V4C16.4183 4 20 7.58172 20 12Z" opacity="0.6" />
    {/* 交互点 */}
    <circle cx="12" cy="12" r="2" className="text-[#C82E31]" fill="currentColor" />
  </svg>
)

// 3. 案例库：【竹简】 - 错落有致，数据经纬
export const IconCases = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 左简 */}
    <rect x="5" y="4" width="3" height="16" rx="1" />
    {/* 中简 - 突出 */}
    <rect x="10.5" y="2" width="3" height="20" rx="1" />
    {/* 右简 */}
    <rect x="16" y="4" width="3" height="16" rx="1" opacity="0.6" />
    {/* 编绳 - 连接线 */}
    <rect x="4" y="8" width="16" height="1.5" rx="0.5" className="text-[#FDFBF7]" fill="currentColor" style={{mixBlendMode: 'overlay'}} />
    <rect x="4" y="16" width="16" height="1.5" rx="0.5" className="text-[#FDFBF7]" fill="currentColor" style={{mixBlendMode: 'overlay'}} />
  </svg>
)

// 4. 藏经阁：【典籍】 - 展卷阅读，智慧传承
export const IconLibrary = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 下层书页 */}
    <path d="M4 18H20C20.55 18 21 17.55 21 17V5C21 4.45 20.55 4 20 4H18V18H4V20C4 20.55 4.45 21 5 21H20C20.55 21 21 20.55 21 20V18" opacity="0.5"/>
    {/* 封面主体 */}
    <path d="M17 16H5C3.9 16 3 15.1 3 14V4C3 2.9 3.9 2 5 2H17V16Z" />
    {/* 线装书脊装饰 */}
    <rect x="5" y="4" width="2" height="10" rx="0.5" className="text-[#FDFBF7]" fill="currentColor" style={{mixBlendMode: 'overlay'}} opacity="0.5" />
    <rect x="17" y="2" width="2" height="14" />
  </svg>
)
