'use client'

import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/lib/components/ui/card'

// 类型定义
export interface TrendingTopic {
  rank: number
  title: string
  hot: string
}

interface TrendingTopicsCardProps {
  topics?: TrendingTopic[]
}

/**
 * 论道风向标卡片 (Trending Topics Card)
 * 显示热门话题排行榜，前三名使用金银铜颜色区分
 */
export default function TrendingTopicsCard({ topics }: TrendingTopicsCardProps) {
  // 默认数据
  const defaultTopics: TrendingTopic[] = [
    { rank: 1, title: '2024年九紫离火运全方位解析', hot: '2.3w' },
    { rank: 2, title: '梅花易数起卦真的比六爻快吗？', hot: '1.8w' },
    { rank: 3, title: '测感情最怕遇到的三个卦', hot: '9k' },
    { rank: 4, title: '实战案例：如何看应期', hot: '5k' },
  ]

  const displayTopics = topics || defaultTopics

  return (
    <Card className="border border-stone-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Flame className="h-4 w-4 text-[#C82E31]" />
          <h3 className="text-sm font-bold text-stone-800">论道风向标</h3>
        </div>
        <div className="space-y-4">
          {displayTopics.map((item, i) => (
            <div key={i} className="flex items-start gap-3 group cursor-pointer">
              {/* 金银铜颜色区分前三名 */}
              <div className={`text-xs font-bold mt-0.5 w-5 h-5 flex items-center justify-center rounded shadow-sm ${
                i === 0 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-300' :
                i === 1 ? 'bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600 border border-stone-300' :
                i === 2 ? 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 border border-orange-200' :
                'bg-stone-50 text-stone-400 border border-stone-200'
              }`}>
                {item.rank}
              </div>
              <div className="flex-1">
                <p className="text-xs text-stone-700 font-medium group-hover:text-[#C82E31] transition-colors line-clamp-1">
                  {item.title}
                </p>
                <span className="text-[10px] text-stone-400 mt-0.5 block">{item.hot} 热度</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

