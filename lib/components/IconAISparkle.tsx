export const IconAISparkle = ({ className }: { className?: string }) => (
  // export const IconAICore = ({ className }: { className?: string }) => (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes core-breath { 
          0%, 100% { r: 3; opacity: 1; } 
          50% { r: 4; opacity: 0.8; } 
        }
        .outer-ring { animation: spin-slow 8s linear infinite; transform-origin: center; }
        .inner-core { animation: core-breath 2s ease-in-out infinite; }
      `}</style>
  
      {/* 外圈轨道 */}
      <g className="outer-ring">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.6" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <circle cx="12" cy="20" r="1.5" fill="currentColor" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
        <circle cx="20" cy="12" r="1.5" fill="currentColor" />
      </g>
  
      {/* 核心 */}
      <circle className="inner-core" cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )