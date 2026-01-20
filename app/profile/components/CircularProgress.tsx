export interface CircularProgressProps {
  value: number
  label: string
  totalVerified?: number // 已验证案例数
}

export const CircularProgress = ({ value, label, totalVerified = 0 }: CircularProgressProps) => {
  // 如果没有参与过验证，显示等待状态
  if (totalVerified === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="relative w-16 h-16 flex items-center justify-center group">
          <svg className="w-full h-full transform -rotate-90">
            {/* 底圈 - 浅灰色 */}
            <circle cx="32" cy="32" r="28" stroke="#E5E7EB" strokeWidth="4" fill="none" />
          </svg>
          <span className="absolute text-xs text-gray-400 font-serif group-hover:scale-110 transition-transform">
            待实证
          </span>
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-[0.625rem] text-gray-400 text-center px-2 leading-tight">
          暂无验证数据<br />快去参与推演吧
        </span>
      </div>
    )
  }

  // 有数据则正常显示
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="relative w-16 h-16 flex items-center justify-center group">
        <svg className="w-full h-full transform -rotate-90 transition-all duration-1000 ease-out">
          {/* 底圈 */}
          <circle cx="32" cy="32" r="28" stroke="#E5E7EB" strokeWidth="4" fill="none" />
          {/* 进度圈 */}
          <circle 
            cx="32" cy="32" r="28" 
            stroke="#C0392B" strokeWidth="4" fill="none" 
            strokeDasharray={`${value * 1.75} 200`} 
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
        </svg>
        <span className="absolute text-sm font-bold text-[#C0392B] font-mono group-hover:scale-110 transition-transform">
          {value}%
        </span>
      </div>
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
  )
}

