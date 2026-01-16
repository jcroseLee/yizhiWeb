export default function LogoHeader() {
  return (
    <div className="flex flex-col items-center space-y-4 mb-8">
      <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.9)" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" rx="40" fill="url(#whiteGradient)"/>
          <path d="M100 40 C 50 40, 20 80, 20 100 C 20 120, 50 160, 100 160 C 150 160, 180 120, 180 100 C 180 80, 150 40, 100 40 Z" 
                fill="none" stroke="#2C3E50" strokeWidth="8" strokeLinecap="round"/>

          <line x1="70" y1="75" x2="130" y2="75" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
          <line x1="65" y1="100" x2="85" y2="100" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
          <line x1="115" y1="100" x2="135" y2="100" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
          <circle cx="100" cy="100" r="10" fill="#C82E31" />
          <line x1="70" y1="125" x2="130" y2="125" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-serif font-medium tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
          易 知
        </h1>
        <p className="text-sm text-white/40 tracking-wide font-light">
          探 索 东 方 智 慧 · 洞 见 未 来 之 变
        </p>
      </div>
    </div>
  )
}
