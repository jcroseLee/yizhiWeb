'use client'

import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { getSession } from '@/lib/services/auth'
import { createCustomTag, getTags, type DivinationMethodType, type Tag } from '@/lib/services/community'
import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

const METHOD_OPTIONS: Array<{ value: DivinationMethodType; label: string }> = [
  { value: 'liuyao', label: '六爻' },
  { value: 'bazi', label: '八字' },
  { value: 'qimen', label: '奇门' },
  { value: 'meihua', label: '梅花' },
  { value: 'ziwei', label: '紫微' },
  { value: 'general', label: '通用/易理' },
]

interface TagPanelProps {
  method: DivinationMethodType
  onMethodChange: (method: DivinationMethodType) => void
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  methodLocked?: boolean
  title?: string
  backgroundDesc?: string
  required?: boolean // 是否必选求测事类标签
}

export default function TagPanel({
  method,
  onMethodChange,
  selectedTags,
  onTagsChange,
  methodLocked = false,
  title = '',
  backgroundDesc = '',
  required = false,
}: TagPanelProps) {
  const { toast } = useToast()
  const [availableSubjects, setAvailableSubjects] = useState<Tag[]>([])
  const [availableTechniques, setAvailableTechniques] = useState<Tag[]>([])
  const [availableCustom, setAvailableCustom] = useState<Tag[]>([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [isSuggestingTags, setIsSuggestingTags] = useState(false)
  const [customTagName, setCustomTagName] = useState('')
  const [creatingCustomTag, setCreatingCustomTag] = useState(false)

  const selectedSubjectTags = selectedTags.filter((t) => t.category === 'subject')
  const selectedTechniqueTags = selectedTags.filter((t) => t.category === 'technique')
  const selectedCustomTags = selectedTags.filter((t) => t.category === 'custom')

  const methodLabel = METHOD_OPTIONS.find((x) => x.value === method)?.label || method

  const toggleTag = (tag: Tag) => {
    const exists = selectedTags.some((t) => t.id === tag.id)
    if (exists) {
      onTagsChange(selectedTags.filter((t) => t.id !== tag.id))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const handleSuggestTags = async () => {
    try {
      setIsSuggestingTags(true)
      const session = await getSession()
      const res = await fetch('/api/ai/tag-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          content: backgroundDesc.trim(),
          method,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'AI 推荐失败')
      }

      const names: string[] = Array.isArray(data?.tags) ? data.tags : []
      const pool = [...availableSubjects, ...availableTechniques]
      const matched: Tag[] = []
      for (const name of names) {
        const found = pool.find((t) => t.name === name)
        if (found) matched.push(found)
      }
      const unique = Array.from(new Map(matched.map((t) => [t.id, t])).values())
      onTagsChange(unique)
    } catch (error) {
      toast({ title: 'AI 推荐失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setIsSuggestingTags(false)
    }
  }

  const handleCreateCustomTag = async () => {
    const name = customTagName.trim()
    if (!name) return
    try {
      setCreatingCustomTag(true)
      const scope = method === 'general' ? null : method
      const created = await createCustomTag({ name, scope })
      setCustomTagName('')
      setAvailableCustom((prev) => {
        if (prev.some((t) => t.id === created.id)) return prev
        return [created, ...prev]
      })
      onTagsChange([...selectedTags, created])
    } catch (error) {
      toast({ title: '创建失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setCreatingCustomTag(false)
    }
  }


  // 加载标签
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoadingTags(true)
        const [subjects, techniques, customCommon, customScoped] = await Promise.all([
          getTags({ category: 'subject', scope: null, limit: 200 }),
          method === 'general' ? Promise.resolve([] as Tag[]) : getTags({ category: 'technique', scope: method, limit: 200 }),
          getTags({ category: 'custom', scope: null, limit: 200 }),
          method === 'general' ? Promise.resolve([] as Tag[]) : getTags({ category: 'custom', scope: method, limit: 200 }),
        ])
        if (cancelled) return
        setAvailableSubjects(subjects)
        setAvailableTechniques(techniques)
        setAvailableCustom(Array.from(new Map([...customScoped, ...customCommon].map((t) => [t.id, t])).values()))
      } catch (error) {
        if (cancelled) return
        toast({ title: '加载标签失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
      } finally {
        if (!cancelled) setLoadingTags(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [method, toast])

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-bold text-stone-700">门派</Label>
          <Select value={method} onValueChange={(v: string) => onMethodChange(v as DivinationMethodType)}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="选择门派" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loadingTags || isSuggestingTags || !title.trim() || !backgroundDesc.trim()}
          onClick={handleSuggestTags}
          className="h-9"
        >
          {isSuggestingTags ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          AI 推荐标签
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-stone-700">求测事类</Label>
          {selectedSubjectTags.length === 0 ? (
            <span className={`text-xs px-2 py-0.5 rounded-full ${required ? 'text-red-400 bg-red-50' : 'text-stone-400'}`}>
              {required ? '必选' : '可选'}
            </span>
          ) : (
            <span className="text-xs text-stone-400">{selectedSubjectTags.length} 个</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableSubjects.map((t) => {
            const active = selectedTags.some((x) => x.id === t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  active
                    ? 'bg-[#C82E31]/10 border-[#C82E31]/30 text-[#C82E31]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                {t.name}
              </button>
            )
          })}
          {loadingTags && <span className="text-xs text-stone-400">加载中…</span>}
          {!loadingTags && availableSubjects.length === 0 && (
            <span className="text-xs text-stone-400">暂无可选标签</span>
          )}
        </div>
      </div>

      {method !== 'general' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-stone-700">{methodLabel}技法断语</Label>
            <span className="text-xs text-stone-400">{selectedTechniqueTags.length} 个</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTechniques.map((t) => {
              const active = selectedTags.some((x) => x.id === t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                    active
                      ? 'bg-[#C82E31]/10 border-[#C82E31]/30 text-[#C82E31]'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-white hover:border-[#C82E31]/40 hover:text-[#C82E31]'
                  }`}
                >
                  {t.name}
                </button>
              )
            })}
            {availableTechniques.length === 0 && !loadingTags && (
              <span className="text-xs text-stone-400">暂无可选技法标签</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-stone-700">自定义标签</Label>
          <span className="text-xs text-stone-400">{selectedCustomTags.length} 个</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={customTagName}
            onChange={(e) => setCustomTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreateCustomTag()
              }
            }}
            placeholder="输入后回车添加"
            className="h-9"
          />
          <Button type="button" variant="outline" size="sm" disabled={creatingCustomTag || !customTagName.trim()} onClick={handleCreateCustomTag}>
            {creatingCustomTag ? <Loader2 className="h-4 w-4 animate-spin" /> : '添加'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableCustom.map((t) => {
            const active = selectedTags.some((x) => x.id === t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  active
                    ? 'bg-[#C82E31]/10 border-[#C82E31]/30 text-[#C82E31]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                {t.name}
              </button>
            )
          })}
          {availableCustom.length === 0 && (
            <span className="text-xs text-stone-400">暂无</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-stone-700">已选标签</Label>
        <div className="flex flex-wrap gap-2">
          {selectedTags.length === 0 ? (
            <span className="text-xs text-stone-400">未选择</span>
          ) : (
            selectedTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t)}
                className="text-xs px-2.5 py-1 rounded-md border bg-white border-stone-200 text-stone-700 hover:border-red-200 hover:text-red-600 transition-all"
              >
                {t.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
