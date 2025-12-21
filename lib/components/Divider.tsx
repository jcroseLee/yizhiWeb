interface DividerProps {
  className?: string
  symbol?: string
}

export default function Divider({ 
  className = '', 
  symbol = '✦' 
}: DividerProps) {
  return (
    <div className={`flex items-center gap-4 my-8 opacity-50 ${className}`}>
      <div className="h-px bg-stone-200 flex-1"></div>
      <div className="text-stone-300">{symbol}</div>
      <div className="h-px bg-stone-200 flex-1"></div>
    </div>
  )
}

