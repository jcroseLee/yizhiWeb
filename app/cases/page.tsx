'use client'

import CaseCard, { type CaseItem } from '@/app/cases/components/CaseCard'
import CaseCardSkeleton from '@/app/cases/components/CaseCardSkeleton'
import TextType from '@/lib/components/TextType'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/lib/components/ui/sheet"
import { useToast } from '@/lib/hooks/use-toast'
import { getTags, type DivinationMethodType, type Tag } from '@/lib/services/community'
import { calculateLevel } from '@/lib/services/growth'
import { cn } from '@/lib/utils/cn'
import {
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  XCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------

type Accuracy = 'accurate' | 'inaccurate' | 'partial'

type ApiCaseRow = {
  post_id: string
  title: string
  content: string
  content_html: string | null
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  user_id: string
  author_nickname: string | null
  author_avatar_url: string | null
  author_exp: number | null
  author_title_level: number | null
  feedback_content: string
  accuracy_rating: Accuracy | null
  gua_original_name: string | null
  original_key: string | null
  changing_flags: unknown
  tags: Array<{ id: string; name: string; category: string; scope: string | null }> | null
}

interface FilterOptions {
  verifiedOnly: boolean
  followingOnly: boolean
}

// -----------------------------------------------------------------------------
// 样式补丁
// -----------------------------------------------------------------------------
const styles = `
  .vertical-text {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.25em;
    font-family: "Noto Serif SC", serif;
  }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  
  .seal-stamp {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 2px 8px; font-size: 12px; font-weight: bold;
    color: #C82E31; border: 2px solid #C82E31; border-radius: 4px;
    transform: rotate(-5deg); background-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 1px rgba(200, 46, 49, 0.3) inset;
  }
  .seal-stamp-pending {
    color: #F59E0B; border-color: #F59E0B;
    box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3) inset;
  }
  
  /* 移动端 Tab 激活样式 */
  .tab-active {
    color: #1f2937;
    font-weight: 600;
  }
  .tab-active::after {
    content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 20px; height: 3px; background: #C82E31; border-radius: 2px;
  }
`

// -----------------------------------------------------------------------------
// 辅助函数
// -----------------------------------------------------------------------------

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractBackground(content: string) {
  const cleaned = content
    .replace(/\*\*关联排盘[^*]*\*\*/g, '')
    .replace(/\*\*问题[^*]*\*\*/g, '')
    .replace(/关联排盘[:：][^\n]*/g, '')
    .replace(/问题[:：][^\n]*/g, '')
    .trim()
  const parts = cleaned.split('<h2>卦理推演</h2>')
  return (parts[0] || cleaned).replace(/\n+/g, ' ').trim()
}

function toLinesFromKey(key: string | null): boolean[] {
  const normalized = String(key || '').replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
  if (normalized.length !== 6) return [false, false, false, false, false, false]
  const lines: boolean[] = []
  for (let i = 0; i < 6; i++) lines.push(normalized[i] === '1')
  return lines.reverse()
}

function toChangingLines(flags: unknown): number[] {
  if (!Array.isArray(flags)) return []
  const result: number[] = []
  for (let i = 0; i < flags.length && i < 6; i++) {
    if (flags[i]) result.push(i)
  }
  return result
}

function formatTimeAgo(iso: string) {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}天前`
  return new Date(iso).toLocaleDateString()
}

// -----------------------------------------------------------------------------
// 静态配置
// -----------------------------------------------------------------------------
const MAIN_TABS = [
  { id: 'recommended', label: '推荐' },
  { id: 'latest', label: '最新' },
  { id: 'hot', label: '热榜' },
  { id: 'featured', label: '精华', icon: '🏆' },
]

const METHOD_OPTIONS: Array<{ value: DivinationMethodType; label: string }> = [
  { value: 'liuyao', label: '六爻' },
  { value: 'bazi', label: '八字' },
  { value: 'qimen', label: '奇门' },
  { value: 'meihua', label: '梅花' },
  { value: 'ziwei', label: '紫微' },
  { value: 'general', label: '通用/易理' },
]

const STATUS_CHIPS = [
  { id: 'accurate', label: '已验·准', icon: CheckCircle2, color: 'green' },
  { id: 'inaccurate', label: '已验·错', icon: XCircle, color: 'red' },
  { id: 'partial', label: '半准', icon: Clock, color: 'orange' }, // 使用 partial 对应
]

const GUA_TYPES = [
  { label: '六冲卦', value: 'liu_chong' },
  { label: '六合卦', value: 'liu_he' },
]

// -----------------------------------------------------------------------------
// 组件：高级筛选内容
// -----------------------------------------------------------------------------
interface FilterPanelProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedTags: Tag[]
  toggleTag: (tag: Tag) => void
  subjectTags: Tag[]
  techniqueTags: Tag[]
  customTags: Tag[]
  method: DivinationMethodType
  setMethod: (val: DivinationMethodType) => void
  accuracy: Accuracy | ''
  setAccuracy: (val: Accuracy | '') => void
  isLiuChong: boolean | null
  setIsLiuChong: (val: boolean | null) => void
  isLiuHe: boolean | null
  setIsLiuHe: (val: boolean | null) => void
  filterOptions: FilterOptions
  setFilterOptions: (options: FilterOptions) => void
  q: string
  setQ: (val: string) => void
  guaName: string
  setGuaName: (val: string) => void
  onClose?: () => void
  onReset?: () => void
  isSidebarMode?: boolean
}

const AdvancedFilterContent = ({
  selectedTags, toggleTag,
  subjectTags, techniqueTags, customTags,
  method, setMethod,
  accuracy, setAccuracy,
  isLiuChong, setIsLiuChong,
  isLiuHe, setIsLiuHe,
  filterOptions, setFilterOptions,
  q, setQ,
  guaName, setGuaName,
  onReset, onClose,
  isSidebarMode = false
}: FilterPanelProps) => {

  const toggleGuaType = (type: 'liu_chong' | 'liu_he') => {
    if (type === 'liu_chong') {
       setIsLiuChong(isLiuChong === true ? null : true)
    } else {
       setIsLiuHe(isLiuHe === true ? null : true)
    }
  }

  const renderTags = (tags: Tag[], title: string) => (
    <div>
      <h4 className="text-xs font-medium text-stone-500 mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((t) => {
            const active = selectedTags.some((x) => x.id === t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border transition-all',
                  active
                    ? 'bg-[#C82E31]/10 border-[#C82E31]/30 text-[#C82E31]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                )}
              >
                {t.name}
              </button>
            )
          })
        ) : (
          <span className="text-xs text-stone-400">暂无标签</span>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn("space-y-6", !isSidebarMode && "max-h-[70vh] overflow-y-auto pr-1")}>
      <div className="space-y-2">
        <Label className="text-xs text-stone-500">关键词搜索</Label>
        <Input 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="搜索标题、内容或断语..." 
          className="bg-white border-gray-200 focus:border-[#C82E31] focus:ring-[#C82E31]/10 h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-stone-500">本卦卦名</Label>
        <Input 
          value={guaName} 
          onChange={(e) => setGuaName(e.target.value)} 
          placeholder="如：乾为天 / 大壮 / 姤" 
          className="bg-white border-gray-200 focus:border-[#C82E31] focus:ring-[#C82E31]/10 h-9 text-sm"
        />
      </div>

      <div>
        <h4 className="text-xs font-medium text-stone-500 mb-2">所属门派</h4>
        <div className="flex flex-wrap gap-2">
          {METHOD_OPTIONS.map((opt) => {
            const isSelected = method === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-md border transition-all",
                  isSelected
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-stone-50"
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-stone-500 mb-2">按断语反馈</h4>
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
            const isSelected = accuracy === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setAccuracy(isSelected ? '' : chip.id as Accuracy)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border transition-all",
                  isSelected 
                    ? (chip.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' : chip.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200')
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-stone-50'
                )}
              >
                <chip.icon className="w-3 h-3" />
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-stone-500 mb-2">按卦理特征</h4>
        <div className="flex flex-wrap gap-2">
          {GUA_TYPES.map(type => {
            const isSelected = type.value === 'liu_chong' ? isLiuChong === true : isLiuHe === true
            return (
              <button
                key={type.value}
                onClick={() => toggleGuaType(type.value as any)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
                  isSelected
                    ? 'bg-ink-100 text-ink-800 border-ink-300'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      {renderTags(subjectTags, '求测事类')}
      {method !== 'general' && renderTags(techniqueTags, '技法断语')}
      {renderTags(customTags, '自定义标签')}

      <div className="border-t border-gray-100 pt-4">
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-sm text-gray-700 cursor-pointer group">
            <span className="group-hover:text-gray-900 transition-colors">只看认证卦师</span>
            <input 
              type="checkbox" 
              checked={filterOptions.verifiedOnly}
              onChange={e => setFilterOptions({...filterOptions, verifiedOnly: e.target.checked})}
              className="accent-[#C82E31] w-4 h-4 rounded border-gray-300"
            />
          </label>
        </div>
      </div>

      {!isSidebarMode && (
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
          <Button variant="outline" className="flex-1" onClick={onReset}>重置</Button>
          <Button className="flex-1 bg-[#C82E31] hover:bg-[#A61B1F] text-white" onClick={onClose}>确定</Button>
        </div>
      )}
      
      {isSidebarMode && (
         <div className="pt-4 border-t border-gray-100">
            <Button variant="outline" className="w-full text-xs h-8" onClick={onReset}>重置筛选</Button>
         </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 组件：筛选面板
// -----------------------------------------------------------------------------
const FilterPanel = (props: FilterPanelProps) => {
  const {
    activeTab, setActiveTab
  } = props

  const router = useRouter()

  return (
    <Card className="bg-white/95 border border-ink-200/50 shadow-sm sticky top-0 z-20 backdrop-blur-md">
      <CardContent className="p-0 lg:p-4">
        
        {/* Mobile: Tabs Scroll with Filter */}
        <div className="lg:hidden px-4 py-2 flex items-center gap-4 bg-white">
          <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-6">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm py-2 whitespace-nowrap relative transition-all ${
                  activeTab === tab.id ? 'tab-active' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className={`flex items-center gap-1 text-xs text-gray-500 shrink-0`}>
                <Filter className="h-3 w-3" /> 筛选
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl p-6 pb-10 bg-white">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>高级筛选</SheetTitle>
              </SheetHeader>
              <AdvancedFilterContent {...props} onClose={() => document.body.click()} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: Tabs */}
        <div className="hidden lg:flex items-center justify-between mb-0">
          <div className="flex gap-6">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm font-semibold transition-colors pb-1 border-b-2 ${
                  activeTab === tab.id ? 'text-gray-900 border-[#C82E31]' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => router.push('/cases/publish')}
            className="flex items-center gap-2 px-4 py-1.5 text-white rounded text-sm bg-[#C82E31] hover:bg-[#A61B1F] shadow-sm"
          >
            <Plus className="h-4 w-4" /> 发布
          </button>
        </div>

      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// 移动端发布按钮 (悬浮)
// -----------------------------------------------------------------------------
const MobileFab = () => {
    const router = useRouter();
    return (
        <button 
            onClick={() => router.push('/cases/publish')}
            className="lg:hidden fixed bottom-6 right-6 w-12 h-12 bg-[#C82E31] text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-[#A61B1F] active:scale-90 transition-all"
        >
            <Plus className="h-6 w-6" />
        </button>
    )
}

// -----------------------------------------------------------------------------
// 页面入口
// -----------------------------------------------------------------------------

export default function CasesPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Filters State
  const [activeTab, setActiveTab] = useState('recommended')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [method, setMethod] = useState<DivinationMethodType>('liuyao')
  const [accuracy, setAccuracy] = useState<Accuracy | ''>('')
  const [isLiuChong, setIsLiuChong] = useState<boolean | null>(null)
  const [isLiuHe, setIsLiuHe] = useState<boolean | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ verifiedOnly: false, followingOnly: false })
  const [q, setQ] = useState('')
  const [guaName, setGuaName] = useState('')

  // Data State
  const [subjectTags, setSubjectTags] = useState<Tag[]>([])
  const [techniqueTags, setTechniqueTags] = useState<Tag[]>([])
  const [customTags, setCustomTags] = useState<Tag[]>([])
  const [items, setItems] = useState<ApiCaseRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  // Derived
  const selectedTagIds = useMemo(() => selectedTags.map((t) => t.id), [selectedTags])

  const buildQuery = useCallback((pOffset: number) => {
    const sp = new URLSearchParams()
    
    // Mapping Tabs to Order/Query
    if (activeTab === 'recommended') sp.set('order', 'featured')
    else if (activeTab === 'latest') sp.set('order', 'latest') // Assuming backend supports
    else if (activeTab === 'hot') sp.set('order', 'hot')
    else if (activeTab === 'featured') sp.set('order', 'featured')
    else sp.set('order', 'featured')

    if (accuracy) sp.set('accuracy', accuracy)
    if (selectedTagIds.length) sp.set('tags', selectedTagIds.join(','))
    if (isLiuChong !== null) sp.set('is_liu_chong', isLiuChong ? '1' : '0')
    if (isLiuHe !== null) sp.set('is_liu_he', isLiuHe ? '1' : '0')
    if (q.trim()) sp.set('q', q.trim())
    if (guaName.trim()) sp.set('gua_name', guaName.trim())
    if (filterOptions.verifiedOnly) sp.set('verified', '1')
    
    // Extra filters
    // if (filterOptions.followingOnly) sp.set('following', '1') // Backend support needed?

    sp.set('limit', '20')
    sp.set('offset', String(pOffset))
    return sp
  }, [activeTab, selectedTagIds, accuracy, isLiuChong, isLiuHe, filterOptions, q, guaName])

  const fetchCases = useCallback(async (pOffset: number, mode: 'replace' | 'append') => {
    try {
      setLoading(true)
      if (mode === 'replace') setItems([])
      const sp = buildQuery(pOffset)
      const res = await fetch(`/api/library/cases?${sp.toString()}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || '加载失败')
      const newItems = Array.isArray(data?.items) ? (data.items as ApiCaseRow[]) : []
      const newTotal = typeof data?.total === 'number' ? data.total : 0
      setTotal(newTotal)
      setOffset(pOffset + newItems.length)
      setItems((prev) => (mode === 'append' ? [...prev, ...newItems] : newItems))
    } catch (e) {
      toast({ title: '加载案例失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [buildQuery, toast])

  // Initial Load & Method Change
  useEffect(() => {
    setLoading(true)
    let cancelled = false
    const load = async () => {
      try {
        const [subjects, techniques, customCommon, customScoped] = await Promise.all([
          getTags({ category: 'subject', scope: null, limit: 200 }),
          method === 'general' ? Promise.resolve([] as Tag[]) : getTags({ category: 'technique', scope: method, limit: 200 }),
          getTags({ category: 'custom', scope: null, limit: 200 }),
          method === 'general' ? Promise.resolve([] as Tag[]) : getTags({ category: 'custom', scope: method, limit: 200 }),
        ])
        
        if (cancelled) return
        
        setSubjectTags(subjects)
        setTechniqueTags(techniques)
        // Combine common and scoped custom tags, remove duplicates
        const combinedCustom = Array.from(new Map([...customScoped, ...customCommon].map((t) => [t.id, t])).values())
        setCustomTags(combinedCustom)
      } catch (e) {
        if (!cancelled) {
          toast({ title: '加载标签失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
        }
      }
    }
    
    void load()
    
    return () => {
      cancelled = true
    }
  }, [method, toast])

  // Filter selected tags when method changes
  useEffect(() => {
    setSelectedTags((prev) => {
      if (method === 'general') {
        return prev.filter((t) => t.category !== 'technique' && (t.category !== 'custom' || t.scope === null))
      }
      return prev.filter((t) => {
        if (t.category === 'technique') return t.scope === method
        if (t.category === 'custom') return t.scope === null || t.scope === method
        return true
      })
    })
  }, [method])

  // Refetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCases(0, 'replace')
    }, 500) // Simple debounce for all filters
    return () => clearTimeout(timer)
  }, [activeTab, selectedTags, accuracy, isLiuChong, isLiuHe, filterOptions, q, guaName, method, fetchCases])

  const canLoadMore = items.length < total

  const toggleTag = (t: Tag) => {
    setSelectedTags((prev) => {
      const exists = prev.some((x) => x.id === t.id)
      if (exists) return prev.filter((x) => x.id !== t.id)
      return [...prev, t]
    })
  }

  const reset = () => {
    setActiveTab('recommended')
    setSelectedTags([])
    setMethod('liuyao')
    setAccuracy('')
    setIsLiuChong(null)
    setIsLiuHe(null)
    setFilterOptions({ verifiedOnly: false, followingOnly: false })
    setQ('')
    setGuaName('')
  }

  const mapped: CaseItem[] = useMemo(() => {
    return items.map((row) => {
      const bg = extractBackground(row.content_html ? stripHtml(row.content_html) : row.content)
      const exp = row.author_exp || 0
      const titleLevel = row.author_title_level || 0
      const authorLevel = calculateLevel(exp)
      const isVerified = titleLevel >= 4
      const tagNames = Array.isArray(row.tags) ? row.tags.map((t) => t.name).filter(Boolean) : []
      const accuracyText = row.accuracy_rating === 'accurate' ? '验·准' : row.accuracy_rating === 'inaccurate' ? '验·错' : row.accuracy_rating === 'partial' ? '半准' : '已结案'

      return {
        id: row.post_id,
        question: row.title || '',
        background: bg,
        tags: tagNames,
        guaName: row.gua_original_name || '未知卦',
        author: {
          id: row.user_id,
          name: row.author_nickname || '匿名',
          avatar: row.author_avatar_url || '',
          level: authorLevel,
          isVerified,
        },
        feedback: {
          status: 'verified', // TODO: Determine if pending
          accuracy: row.accuracy_rating === 'accurate' || row.accuracy_rating === 'inaccurate' || row.accuracy_rating === 'partial' ? row.accuracy_rating : undefined,
          text: accuracyText,
        },
        stats: {
          views: row.view_count || 0,
          comments: row.comment_count || 0,
          favorites: row.like_count || 0,
        },
        publishTime: formatTimeAgo(row.created_at),
        lines: toLinesFromKey(row.original_key),
        changingLines: toChangingLines(row.changing_flags),
      }
    })
  }, [items])

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen font-sans text-gray-800">
        <div className="max-w-7xl mx-auto px-0 lg:px-8 pb-6 lg:py-10">
          
          {/* Header Area */}
          <div className="flex items-start justify-between gap-8 mb-6 lg:mb-12 pt-6 lg:pt-10 px-4 lg:px-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-gray-900 mb-2">实证易学 · 案例宝库</h1>
              <p className="text-gray-500 text-xs lg:text-sm font-serif line-clamp-1 lg:line-clamp-none">
                <TextType 
                  text={["不语怪力乱神，但求卦理真知。"]}
                  typingSpeed={150}
                  pauseDuration={1500}
                  showCursor={false}
                  as="span"
                />
              </p>
            </div>
          </div>

          <div className="flex gap-6 lg:gap-8">
            <div className="flex-1 lg:flex-[0_0_70%] space-y-4 lg:space-y-6">
              <FilterPanel 
                activeTab={activeTab} setActiveTab={setActiveTab}
                selectedTags={selectedTags} toggleTag={toggleTag}
                subjectTags={subjectTags}
                techniqueTags={techniqueTags}
                customTags={customTags}
                method={method} setMethod={setMethod}
                accuracy={accuracy} setAccuracy={setAccuracy}
                isLiuChong={isLiuChong} setIsLiuChong={setIsLiuChong}
                isLiuHe={isLiuHe} setIsLiuHe={setIsLiuHe}
                filterOptions={filterOptions} setFilterOptions={setFilterOptions}
                q={q} setQ={setQ}
                guaName={guaName} setGuaName={setGuaName}
                onClose={() => {}} // Add onClose stub if needed, though it's optional in interface
                onReset={reset}
              />

              <div className="space-y-3 lg:space-y-4 px-2 lg:px-0">
                {loading && items.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <CaseCardSkeleton key={i} />
                  ))
                ) : (
                  <>
                    {mapped.map((c) => (
                      <CaseCard key={c.id} data={c} />
                    ))}

                    {mapped.length === 0 && !loading && (
                      <div className="text-center py-12 text-sm text-stone-400">暂无符合条件的案例</div>
                    )}
                  </>
                )}

                {items.length > 0 && (
                  <div className="flex justify-center py-4">
                    {canLoadMore ? (
                      <Button variant="outline" onClick={() => fetchCases(offset, 'append')} disabled={loading}>
                        {loading ? '加载中…' : '加载更多'}
                      </Button>
                    ) : (
                      <div className="text-xs text-stone-400 py-2">没有更多内容了</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block lg:flex-[0_0_28%]">
              <div className="sticky top-24 bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">筛选条件</h3>
                  {/* Optional: Add clear all button here or in AdvancedFilterContent */}
                </div>
                <AdvancedFilterContent 
                  activeTab={activeTab} setActiveTab={setActiveTab}
                  selectedTags={selectedTags} toggleTag={toggleTag}
                  subjectTags={subjectTags}
                  techniqueTags={techniqueTags}
                  customTags={customTags}
                  method={method} setMethod={setMethod}
                  accuracy={accuracy} setAccuracy={setAccuracy}
                  isLiuChong={isLiuChong} setIsLiuChong={setIsLiuChong}
                  isLiuHe={isLiuHe} setIsLiuHe={setIsLiuHe}
                  filterOptions={filterOptions} setFilterOptions={setFilterOptions}
                  q={q} setQ={setQ}
                  guaName={guaName} setGuaName={setGuaName}
                  onReset={reset}
                  isSidebarMode={true}
                />
              </div>
            </div>
          </div>
        </div>
        <MobileFab />
      </div>
    </>
  )
}
