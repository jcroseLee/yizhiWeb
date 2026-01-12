'use client'

import CaseCard, { type CaseItem } from '@/app/cases/components/CaseCard'
import CaseCardSkeleton from '@/app/cases/components/CaseCardSkeleton'
import TextType from '@/lib/components/TextType'
import { Button } from '@/lib/components/ui/button'
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
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  XCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

// -----------------------------------------------------------------------------
// 类型定义 (保持不变)
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
// 样式补丁 (视觉核心)
// -----------------------------------------------------------------------------
const styles = `
  /* 宣纸肌理背景 */
  .paper-texture {
    background-color: #FDFBF7;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  }

  /* 方案一：虚室生白 - Header 背景 */
  .header-bg-void {
    background-color: #FDFBF7 !important;
    /* 基础宣纸噪点 */
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E") !important;
    position: relative !important;
    overflow: hidden !important;
  }
  
  /* 顶部隐约的光源 */
  .header-bg-void::before {
    content: '' !important;
    position: absolute !important;
    top: -50% !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 100% !important;
    height: 200% !important;
    background: radial-gradient(circle, rgba(200, 46, 49, 0.03) 0%, rgba(255,255,255,0) 60%) !important;
    pointer-events: none !important;
    z-index: 0 !important;
  }

  /* 底部淡出的网格线（象征逻辑/经纬） */
  .header-bg-void::after {
    content: '' !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 100% !important;
    background-image: linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px) !important;
    background-size: 40px 40px !important;
    mask-image: linear-gradient(to bottom, transparent 20%, black 100%) !important;
    -webkit-mask-image: linear-gradient(to bottom, transparent 20%, black 100%) !important;
    pointer-events: none !important;
    z-index: 0 !important;
  }

  /* 底部遮罩，平滑过渡到下方内容 */
  .header-mask {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(to bottom, transparent, #FDFBF7);
    pointer-events: none;
  }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  
  /* 玻璃拟态面板 */
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  }

  /* 输入框聚焦动画 */
  .input-focus-ring {
    transition: all 0.3s ease;
  }
  .input-focus-ring:focus-within {
    border-color: #C82E31;
    box-shadow: 0 0 0 3px rgba(200, 46, 49, 0.1);
    background: white;
  }

  /* 标签胶囊样式 */
  .tag-chip {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tag-chip:hover {
    transform: translateY(-1px);
  }
  .tag-chip-active {
    background-color: #FFF1F2;
    color: #C82E31;
    border-color: #FECDD3;
    font-weight: 500;
  }
`

// -----------------------------------------------------------------------------
// 辅助函数 (保持不变)
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
// 静态配置 (保持不变)
// -----------------------------------------------------------------------------
const MAIN_TABS = [
  { id: 'recommended', label: '推荐', subtitle: '精选案例' },
  { id: 'latest', label: '最新', subtitle: '实时更新' },
  { id: 'hot', label: '热榜', subtitle: '易友热议' },
  { id: 'featured', label: '精华', icon: '🏆', subtitle: '高质复盘' },
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
  { id: 'accurate', label: '已验·准', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { id: 'inaccurate', label: '已验·错', icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { id: 'partial', label: '半准', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
]

const GUA_TYPES = [
  { label: '六冲卦', value: 'liu_chong' },
  { label: '六合卦', value: 'liu_he' },
]

// -----------------------------------------------------------------------------
// 组件：高级筛选内容 (UI 优化版)
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
    <div className="mb-6 last:mb-0">
      <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
        {title}
      </h4>
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
                  'text-xs px-3 py-1.5 rounded-full border transition-all tag-chip',
                  active
                    ? 'tag-chip-active'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                )}
              >
                {t.name}
              </button>
            )
          })
        ) : (
          <span className="text-xs text-stone-400 pl-1">暂无标签</span>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn("space-y-6", !isSidebarMode && "max-h-[70vh] overflow-y-auto pr-2 pb-4")}>
      
      {/* 搜索区 - 视觉优化 */}
      <div className="space-y-4 bg-stone-50/50 p-4 rounded-xl border border-stone-100">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-stone-500">关键词</Label>
          <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-[#C82E31] transition-colors" />
             <Input 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                placeholder="搜索断语、卦理..." 
                className="pl-9 bg-white border-stone-200 h-9 text-sm rounded-lg input-focus-ring placeholder:text-stone-300"
             />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-stone-500">本卦卦名</Label>
          <Input 
            value={guaName} 
            onChange={(e) => setGuaName(e.target.value)} 
            placeholder="如：乾为天" 
            className="bg-white border-stone-200 h-9 text-sm rounded-lg input-focus-ring placeholder:text-stone-300"
          />
        </div>
      </div>

      {/* 门派选择 */}
      <div>
        <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
            所属门派
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {METHOD_OPTIONS.map((opt) => {
            const isSelected = method === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                className={cn(
                  "text-xs py-2 rounded-lg border transition-all font-medium",
                  isSelected
                    ? "bg-stone-900 text-white border-stone-900 shadow-md transform scale-[1.02]"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:border-stone-300"
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 反馈状态 */}
      <div>
        <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
            验者反馈
        </h4>
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
            const isSelected = accuracy === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setAccuracy(isSelected ? '' : chip.id as Accuracy)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs border transition-all",
                  isSelected 
                    ? chip.color + " shadow-sm font-medium"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:border-stone-300"
                )}
              >
                <chip.icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
            特殊卦象
        </h4>
        <div className="flex flex-wrap gap-2">
          {GUA_TYPES.map(type => {
            const isSelected = type.value === 'liu_chong' ? isLiuChong === true : isLiuHe === true
            return (
              <button
                key={type.value}
                onClick={() => toggleGuaType(type.value as any)}
                className={cn(
                    "px-4 py-1.5 rounded-full text-xs transition-all border",
                    isSelected
                    ? "bg-stone-100 text-stone-800 border-stone-400 font-medium"
                    : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                )}
              >
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-stone-100 my-4" />

      {renderTags(subjectTags, '事类标签')}
      {method !== 'general' && renderTags(techniqueTags, '技法断语')}
      {renderTags(customTags, '自定义标签')}

      <div className="pt-2">
        <label className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white cursor-pointer hover:border-stone-300 transition-colors">
          <span className="text-sm text-stone-700 font-medium">只看认证卦师</span>
          <input 
            type="checkbox" 
            checked={filterOptions.verifiedOnly}
            onChange={e => setFilterOptions({...filterOptions, verifiedOnly: e.target.checked})}
            className="accent-[#C82E31] w-4 h-4 rounded border-stone-300"
          />
        </label>
      </div>

      {!isSidebarMode && (
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-white/95 backdrop-blur pb-2 border-t border-stone-100">
          <Button variant="outline" className="flex-1 border-stone-200 text-stone-600 hover:bg-stone-50" onClick={onReset}>重置</Button>
          <Button className="flex-1 bg-[#C82E31] hover:bg-[#A61B1F] text-white shadow-md shadow-red-100" onClick={onClose}>确定</Button>
        </div>
      )}
      
      {isSidebarMode && (
         <div className="pt-4 mt-4 border-t border-stone-100">
            <Button variant="ghost" className="w-full text-xs h-8 text-stone-400 hover:text-stone-600" onClick={onReset}>
                <SlidersHorizontal className="w-3 h-3 mr-2" />
                重置所有筛选
            </Button>
         </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 组件：顶部主筛选栏 (UI 优化版)
// -----------------------------------------------------------------------------
const FilterPanel = (props: FilterPanelProps) => {
  const {
    activeTab, setActiveTab
  } = props

  const router = useRouter()

  return (
    <div className="sticky top-0 z-20 pb-4 bg-transparent">
        <div className="glass-panel rounded-2xl px-1 py-1 flex items-center justify-between">
            {/* Desktop Tabs */}
            <div className="hidden lg:flex items-center p-1">
                {MAIN_TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "relative px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-300",
                        activeTab === tab.id 
                            ? "text-[#C82E31] bg-white shadow-sm" 
                            : "text-stone-500 hover:text-stone-800 hover:bg-stone-100/50"
                    )}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {tab.label}
                        {tab.icon && <span className="text-xs">{tab.icon}</span>}
                    </span>
                </button>
                ))}
            </div>

            {/* Mobile Tabs Scroll */}
            <div className="lg:hidden flex-1 overflow-x-auto scrollbar-hide flex items-center px-2">
                {MAIN_TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "text-sm px-4 py-2 whitespace-nowrap transition-all rounded-lg",
                        activeTab === tab.id ? 'text-[#C82E31] font-bold bg-white shadow-sm' : 'text-stone-500'
                    )}
                >
                    {tab.label}
                </button>
                ))}
            </div>

            <div className="flex items-center gap-2 pr-2 lg:pr-1">
                {/* Mobile Filter Trigger */}
                <Sheet>
                    <SheetTrigger asChild>
                    <button className="lg:hidden p-2 rounded-lg bg-white border border-stone-200 text-stone-500 shadow-sm">
                        <Filter className="h-4 w-4" />
                    </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-3xl p-6 pb-10 bg-[#FDFBF7] max-h-[85vh]">
                    <SheetHeader className="mb-6 text-left border-b border-stone-100 pb-4">
                        <SheetTitle className="font-serif text-xl text-stone-800">高级筛选</SheetTitle>
                    </SheetHeader>
                    <AdvancedFilterContent {...props} onClose={() => document.body.click()} />
                    </SheetContent>
                </Sheet>

                <Button 
                    onClick={() => router.push('/cases/publish')}
                    className="hidden lg:flex items-center gap-2 bg-[#1c1917] hover:bg-[#333] text-white px-5 rounded-xl shadow-lg shadow-stone-200 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="h-4 w-4" /> 
                    <span>分享案例</span>
                </Button>
            </div>
        </div>
    </div>
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
            className="lg:hidden fixed bottom-8 right-6 w-14 h-14 bg-[#1c1917] text-white rounded-full shadow-xl shadow-stone-400/40 flex items-center justify-center z-50 hover:bg-[#333] active:scale-90 transition-all border-2 border-white/20 backdrop-blur-sm"
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
    
    if (activeTab === 'recommended') sp.set('order', 'featured')
    else if (activeTab === 'latest') sp.set('order', 'latest') 
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

  // Initial Load
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
        const combinedCustom = Array.from(new Map([...customScoped, ...customCommon].map((t) => [t.id, t])).values())
        setCustomTags(combinedCustom)
      } catch (e) {
        if (!cancelled) {
          toast({ title: '加载标签失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [method, toast])

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

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCases(0, 'replace')
    }, 500)
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
          status: 'verified',
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
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="min-h-screen font-sans text-stone-800 paper-texture selection:bg-[#C82E31] selection:text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12 lg:py-12">
          
          {/* Header Area - 方案一：虚室生白 */}
          <div className="header-bg-void mb-10 pt-10 pb-12 -mx-4 lg:-mx-8 px-4 lg:px-8 border-b border-stone-100 relative">
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="h-px w-8 bg-[#C82E31]"></div>
                <span className="text-xs font-bold text-[#C82E31] tracking-widest uppercase">Case Library</span>
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-serif font-bold text-stone-900 mb-4 tracking-tight animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
                实证易学 · <span className="relative inline-block">
                  案例宝库
                  {/* 标题下方的笔触装饰 */}
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#C82E31] opacity-20" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </span>
              </h1>
              
              <p className="text-stone-500 text-sm font-serif max-w-lg leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <TextType 
                  text={["不语怪力乱神，但求卦理真知。", "汇聚万千易友的实战经验，探索象数理的奥秘。"]}
                  typingSpeed={80}
                  pauseDuration={2000}
                  showCursor={false}
                  as="span"
                />
              </p>
            </div>
            
            {/* 底部遮罩，平滑过渡 */}
            <div className="header-mask" />
          </div>

          <div className="flex gap-8 items-start relative">
            {/* Left Content Area */}
            <div className="flex-1 min-w-0 space-y-6">
              
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
                onClose={() => {}}
                onReset={reset}
              />

              <div className="space-y-4">
                {loading && items.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <CaseCardSkeleton key={i} />
                  ))
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {mapped.map((c) => (
                      <div key={c.id} className="transition-transform duration-300 hover:-translate-y-1">
                          <CaseCard data={c} />
                      </div>
                    ))}

                    {mapped.length === 0 && !loading && (
                      <div className="flex flex-col items-center justify-center py-24 text-stone-400 bg-white/50 rounded-2xl border border-stone-100 border-dashed">
                          <Search className="w-10 h-10 mb-4 opacity-20" />
                          <p className="text-sm">暂无符合条件的案例</p>
                          <Button variant="link" onClick={reset} className="text-[#C82E31] text-xs mt-2">清除筛选条件</Button>
                      </div>
                    )}
                  </div>
                )}

                {items.length > 0 && (
                  <div className="flex justify-center py-8">
                    {canLoadMore ? (
                      <Button 
                        variant="outline" 
                        onClick={() => fetchCases(offset, 'append')} 
                        disabled={loading}
                        className="rounded-full px-8 border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300 bg-white/80 backdrop-blur-sm"
                      >
                        {loading ? '加载中…' : '查看更多案例'}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-stone-300 py-4">
                          <span className="w-8 h-px bg-stone-200"></span>
                          <span>已展示全部内容</span>
                          <span className="w-8 h-px bg-stone-200"></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar (Desktop) - Sticky Control Panel */}
            <div className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-24 space-y-6">
                <div className="glass-panel rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                    <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-[#C82E31]" />
                        深度筛选
                    </h3>
                    <button onClick={reset} className="text-xs text-stone-400 hover:text-[#C82E31] transition-colors">
                        重置
                    </button>
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
                
                {/* 装饰性占位或广告位 */}
                <div className="rounded-2xl bg-gradient-to-br from-[#1c1917] to-[#2d2a28] p-6 text-white relative overflow-hidden shadow-lg group cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#C82E31] rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <h4 className="text-lg font-serif font-bold mb-2 relative z-10">悬赏解卦</h4>
                    <p className="text-xs text-white/60 mb-4 leading-relaxed relative z-10">遇到疑难卦象？发布悬赏，邀请社区高人指点迷津。</p>
                    <div className="flex items-center text-xs font-bold text-[#C82E31]">
                        立即发布 <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform"/>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <MobileFab />
      </div>
    </>
  )
}