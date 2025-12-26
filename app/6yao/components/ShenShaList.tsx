import { type ShenShaItem } from '@/lib/utils/liuyaoDetails'

export interface ShenShaListProps {
  list: ShenShaItem[]
}

export const ShenShaList = ({ list }: ShenShaListProps) => (
  <div className="flex flex-wrap gap-2 lg:gap-4 text-xs">
    {list.map((ss, idx) => (
      <span key={idx} className="text-stone-500 font-serif flex items-center bg-white px-2 py-1 rounded border border-stone-100 shadow-sm">
         <span className="text-stone-400 mr-1.5">{ss.name}</span>
         <span className="font-medium text-stone-700">{ss.value}</span>
      </span>
    ))}
  </div>
)
