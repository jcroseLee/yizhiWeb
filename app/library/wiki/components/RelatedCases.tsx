'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card'
import { Skeleton } from '@/lib/components/ui/skeleton'
import { WikiService } from '@/lib/services/wiki'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function RelatedCases({ articleId }: { articleId: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await WikiService.getRelatedCases(articleId)
        setPosts(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (articleId) fetchPosts()
  }, [articleId])

  if (loading) {
      return (
        <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )
  }

  if (!posts.length) return null

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
            实战案例
            <span className="text-xs font-sans font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {posts.length}
            </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-5">
        {posts.map(post => (
          <Link key={post.id} href={`/community/${post.id}`} className="block group">
            <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium text-slate-800 group-hover:text-blue-600 line-clamp-2 leading-relaxed transition-colors">
                {post.title}
                </h4>
                
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                        <Avatar className="w-4 h-4">
                            <AvatarImage src={post.profiles?.avatar_url} />
                            <AvatarFallback className="text-[9px]">{post.profiles?.nickname?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-500 truncate max-w-[80px]">{post.profiles?.nickname}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            {post.likes || 0}
                        </div>
                    </div>
                </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
