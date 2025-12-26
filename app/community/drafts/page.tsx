'use client'

import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import { useToast } from '@/lib/hooks/use-toast'
import { deleteDraft, getUserDrafts, type Post } from '@/lib/services/community'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Edit, FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getUserDrafts({ limit: 50 })
      setDrafts(data)
    } catch (error) {
      console.error('Failed to load drafts:', error)
      toast({
        title: '加载失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleDelete = async (draftId: string) => {
    if (!confirm('确定要删除这个草稿吗？此操作无法撤销。')) {
      return
    }

    try {
      setDeletingId(draftId)
      await deleteDraft(draftId)
      toast({ title: '草稿已删除' })
      setDrafts(prev => prev.filter(d => d.id !== draftId))
    } catch (error) {
      console.error('Failed to delete draft:', error)
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN })
    } catch {
      return dateString
    }
  }

  const getContentPreview = (content: string, maxLength: number = 100): string => {
    if (!content) return '暂无内容'
    // 移除 HTML 标签和 Markdown 标记
    const text = content
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\n+/g, ' ')
      .trim()
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-800 mb-2">我的草稿</h1>
            <p className="text-stone-500">
              共 {drafts.length} 篇草稿
            </p>
          </div>
          <Link href="/community/publish">
            <Button className="bg-[#C82E31] hover:bg-[#b02225] text-white rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              新建草稿
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && drafts.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-800 mb-2">
              还没有草稿
            </h3>
            <p className="text-stone-500 mb-6">
              开始创作您的第一篇草稿吧
            </p>
            <Link href="/community/publish">
              <Button className="bg-[#C82E31] hover:bg-[#b02225] text-white rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                新建草稿
              </Button>
            </Link>
          </Card>
        )}

        {/* Drafts List */}
        {!loading && drafts.length > 0 && (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className="p-6 hover:shadow-lg transition-shadow border border-stone-200"
              >
                <div className="flex gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-stone-800 mb-2 line-clamp-1">
                      {draft.title || '未命名草稿'}
                    </h3>
                    <p className="text-sm text-stone-600 mb-3 line-clamp-2">
                      {getContentPreview(draft.content)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {draft.type === 'help' ? '悬卦' : draft.type === 'debate' ? '争鸣' : draft.type === 'chat' ? '茶寮' : '论道'}
                      </span>
                      <span>更新于 {formatTime(draft.updated_at)}</span>
                      {draft.cover_image_url && (
                        <span className="text-amber-600">• 有封面</span>
                      )}
                      {draft.divination_record && (
                        <span className="text-blue-600">• 关联排盘</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Link href={`/community/publish?id=${draft.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        继续编辑
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(draft.id)}
                      disabled={deletingId === draft.id}
                    >
                      {deletingId === draft.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1" />
                      )}
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
