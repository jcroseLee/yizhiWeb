'use client'

import { Card, CardContent } from '@/lib/components/ui/card'
import { getPosts } from '@/lib/services/community'
import { Flame } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// 类型定义
export interface TrendingTopic {
  rank: number
  title: string
  hot: string
  postId: string
  viewCount: number
}

interface TrendingTopicsCardProps {
  topics?: TrendingTopic[]
}

/**
 * 格式化阅读量为热度显示
 * @param viewCount 阅读量
 * @returns 格式化后的热度字符串，如 "2.3w", "1.8k", "500"
 */
function formatViewCount(viewCount: number): string {
  if (viewCount >= 10000) {
    const w = (viewCount / 10000).toFixed(1)
    return w.endsWith('.0') ? `${parseInt(w)}w` : `${w}w`
  } else if (viewCount >= 1000) {
    const k = (viewCount / 1000).toFixed(1)
    return k.endsWith('.0') ? `${parseInt(k)}k` : `${k}k`
  }
  return viewCount.toString()
}

/**
 * 论道风向标卡片 (Trending Topics Card)
 * 显示热门话题排行榜，前三名使用金银铜颜色区分
 * 自动获取阅读量最高的文章
 */
export default function TrendingTopicsCard({ topics }: TrendingTopicsCardProps) {
  const router = useRouter()
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)

  // 获取阅读量最高的文章
  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setLoading(true)
        // 获取按阅读量排序的前4篇文章
        const posts = await getPosts({
          limit: 4,
          orderBy: 'view_count',
          orderDirection: 'desc',
        })

        if (posts && posts.length > 0) {
          const topicsData: TrendingTopic[] = posts.map((post, index) => ({
            rank: index + 1,
            title: post.title,
            hot: formatViewCount(post.view_count),
            postId: post.id,
            viewCount: post.view_count,
          }))
          setTrendingTopics(topicsData)
        } else {
          // 如果没有数据，显示空
          setTrendingTopics([])
        }
      } catch (error) {
        console.error('Failed to fetch trending posts:', error)
        // 出错时显示空
        setTrendingTopics([])
      } finally {
        setLoading(false)
      }
    }

    // 如果传入了 topics prop，直接使用
    if (topics && topics.length > 0) {
      setTrendingTopics(topics)
      setLoading(false)
    } else {
      // 否则从数据库获取
      fetchTrendingPosts()
    }
  }, [topics])

  const displayTopics = trendingTopics

  const handleTopicClick = (postId: string) => {
    if (postId) {
      router.push(`/community/${postId}`)
    }
  }

  return (
    <Card className="border border-stone-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Flame className="h-4 w-4 text-[#C82E31]" />
          <h3 className="text-sm font-bold text-stone-800">论道风向标</h3>
        </div>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-stone-100 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-stone-100 rounded animate-pulse mb-2" />
                  <div className="h-2 w-12 bg-stone-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : displayTopics.length > 0 ? (
          <div className="space-y-4">
            {displayTopics.map((item, i) => (
              <div
                key={item.postId || i}
                onClick={() => handleTopicClick(item.postId)}
                className="flex items-start gap-3 group cursor-pointer"
              >
                {/* 金银铜颜色区分前三名 */}
                <div className={`text-xs font-bold mt-0.5 w-5 h-5 flex items-center justify-center rounded shadow-sm ${
                  i === 0 ? 'bg-linear-to-br from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-300' :
                  i === 1 ? 'bg-linear-to-br from-stone-100 to-stone-200 text-stone-600 border border-stone-300' :
                  i === 2 ? 'bg-linear-to-br from-orange-50 to-orange-100 text-orange-600 border border-orange-200' :
                  'bg-stone-50 text-stone-400 border border-stone-200'
                }`}>
                  {item.rank}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-stone-700 font-medium group-hover:text-[#C82E31] transition-colors line-clamp-1">
                    {item.title}
                  </p>
                  <span className="text-[0.625rem] text-stone-400 mt-0.5 block">{item.viewCount.toLocaleString()} 阅读</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-stone-400">
            暂无热门文章
          </div>
        )}
      </CardContent>
    </Card>
  )
}

