'use client'

import TextType from '@/lib/components/TextType';
import { Button } from '@/lib/components/ui/button';
import { Card, CardContent } from '@/lib/components/ui/card';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/lib/components/ui/sheet"; // 确保你有这个组件，如果没有请安装 shadcn sheet
import {
    Briefcase,
    CheckCircle2,
    Clock,
    Filter,
    Heart,
    Plus,
    Settings,
    Star,
    TrendingUp,
    Users,
    X,
    XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
// 类型定义
// -----------------------------------------------------------------------------
interface CaseAuthor {
  name: string
  avatar: string
  level: number
  isVerified: boolean
}

interface CaseFeedback {
  status: string
  accuracy?: string
  text: string
}

interface CaseStats {
  views: number
  comments: number
  favorites: number
}

interface CaseData {
  id: number
  question: string
  background: string
  tags: string[]
  guaName: string
  author: CaseAuthor
  feedback: CaseFeedback
  stats: CaseStats
  publishTime: string
  lines: boolean[]
  changingLines: number[]
}

interface FilterOptions {
  verifiedOnly: boolean
  followingOnly: boolean
}

interface FilterPanelProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedCategories: string[]
  toggleCategory: (id: string) => void
  selectedStatuses: string[]
  toggleStatus: (id: string) => void
  selectedGuaTypes: string[]
  toggleGuaType: (val: string) => void
  selectedMethods: string[]
  toggleMethod: (val: string) => void
  filterOptions: FilterOptions
  setFilterOptions: (options: FilterOptions) => void
  onClose?: () => void
  onReset?: () => void
}

// -----------------------------------------------------------------------------
// 数据定义
// -----------------------------------------------------------------------------
const MAIN_TABS = [
  { id: 'recommended', label: '推荐' },
  { id: 'latest', label: '最新' },
  { id: 'hot', label: '热榜' },
  { id: 'featured', label: '精华', icon: '🏆' },
]

const CATEGORY_CHIPS = [
  { id: 'all', label: '全部', icon: null },
  { id: 'career', label: '事业前程', icon: Briefcase },
  { id: 'love', label: '恋爱婚姻', icon: Heart },
  { id: 'wealth', label: '财运投资', icon: Star },
  { id: 'health', label: '疾病健康', icon: Users },
]

const STATUS_CHIPS = [
  { id: 'verified-accurate', label: '已验·准', icon: CheckCircle2, color: 'green' },
  { id: 'verified-inaccurate', label: '已验·错', icon: XCircle, color: 'red' },
  { id: 'pending', label: '待反馈', icon: Clock, color: 'orange' },
]

const GUA_TYPES = ['六冲卦', '六合卦', '静卦', '动卦', '伏吟', '反吟', '游魂', '归魂']
const METHODS = ['金钱课', '时间起卦', '报数起卦', '意念起卦']

const MOCK_CASES = [
  {
    id: 1,
    question: '下个月竞聘大区经理，能成吗？',
    background: '现任副经理，竞争对手有两人，一个资历较深但能力一般，另一个年轻但经验不足...',
    tags: ['事业', '官鬼持世', '六冲卦'],
    guaName: '水火既济',
    author: { name: '用户昵称', avatar: '', level: 5, isVerified: true },
    feedback: { status: 'verified', accuracy: 'accurate', text: '验·准' },
    stats: { views: 1200, comments: 15, favorites: 3 },
    publishTime: '刚刚发布',
    lines: [true, true, false, true, false, true],
    changingLines: [2, 4],
  },
  {
    id: 2,
    question: '和对象最近关系有些紧张，想看看未来发展',
    background: '交往三年，最近因为工作压力大，沟通变少，想了解感情走向...',
    tags: ['感情', '关系', '六合卦'],
    guaName: '地天泰',
    author: { name: '李四', avatar: '', level: 3, isVerified: false },
    feedback: { status: 'pending', text: '待验' },
    stats: { views: 856, comments: 32, favorites: 8 },
    publishTime: '2小时前',
    lines: [false, false, false, true, true, true],
    changingLines: [],
  },
  {
    id: 3,
    question: '考虑投资某个项目，想通过推演了解风险',
    background: '朋友介绍了一个投资项目，回报率不错，但需要投入较大资金...',
    tags: ['投资', '决策', '财运'],
    guaName: '天风姤',
    author: { name: '王五', avatar: '', level: 7, isVerified: true },
    feedback: { status: 'verified', accuracy: 'inaccurate', text: '验·错' },
    stats: { views: 2100, comments: 78, favorites: 12 },
    publishTime: '1天前',
    lines: [true, true, true, true, true, false],
    changingLines: [1],
  },
]

// -----------------------------------------------------------------------------
// 组件：卦象图形
// -----------------------------------------------------------------------------
const GuaGraphic = ({ lines, changingLines = [] }: { lines: boolean[]; changingLines?: number[] }) => (
  <div className="flex flex-col gap-[3px] lg:gap-1.5 w-10 lg:w-12">
    {lines.map((isYang, idx) => {
      const isChanging = changingLines.includes(5 - idx)
      const lineColor = isChanging ? '#C82E31' : '#2B2B2B'
      return (
        <div key={idx} className="flex items-center justify-center relative h-[4px] lg:h-[6px]">
          {isYang ? (
            <div className="w-full h-full rounded-[1px]" style={{ backgroundColor: lineColor }} />
          ) : (
            <div className="flex justify-between w-full h-full gap-1.5 lg:gap-2">
              <div className="w-[42%] h-full rounded-[1px]" style={{ backgroundColor: lineColor }} />
              <div className="w-[42%] h-full rounded-[1px]" style={{ backgroundColor: lineColor }} />
            </div>
          )}
          {isChanging && (
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 border border-[#C82E31] rounded-full" />
          )}
        </div>
      )
    })}
  </div>
)

// -----------------------------------------------------------------------------
// 组件：案例卡片 (CaseCard) - 响应式优化
// -----------------------------------------------------------------------------
const CaseCard = ({ data }: { data: CaseData }) => {
  return (
    <Card className="bg-white border border-ink-200/50 card-shadow active:scale-[0.99] transition-transform duration-200 lg:hover:shadow-lg lg:hover:border-ink-300/60 cursor-pointer">
      <CardContent className="p-4 lg:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 lg:mb-4 pb-2 lg:pb-3 border-b border-ink-200/40">
          <div className="flex items-center gap-2 lg:gap-2.5">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-ink-200 to-ink-300 flex items-center justify-center text-xs lg:text-sm text-ink-700 font-medium shadow-sm overflow-hidden">
              {data.author.avatar ? <img src={data.author.avatar} alt="" className="w-full h-full object-cover" /> : data.author.name.charAt(0)}
            </div>
            <div className="flex items-center gap-1.5 text-xs lg:text-sm">
              <span className="font-medium text-ink-800">{data.author.name}</span>
              <span className="text-ink-400">·</span>
              <span className="text-ink-500 scale-90 lg:scale-100 origin-left">LV.{data.author.level}</span>
              {data.author.isVerified && (
                <>
                  <span className="text-ink-400 hidden lg:inline">·</span>
                  <span className="font-medium text-[#C82E31] scale-90 lg:scale-100 origin-left hidden lg:inline">认证卦师</span>
                  <span className="lg:hidden text-[#C82E31] scale-75 origin-left border border-[#C82E31] px-1 rounded ml-1">V</span>
                </>
              )}
            </div>
          </div>
          <div className={`seal-stamp ${data.feedback.status === 'pending' ? 'seal-stamp-pending' : ''} scale-90 lg:scale-100 origin-right`}>
            {data.feedback.text}
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-3 lg:gap-5">
          {/* Left: Gua */}
          <div className="shrink-0 flex items-start gap-2 lg:gap-3 pt-1">
            <div className="flex items-center gap-2 lg:gap-3 bg-[#F9F9F9] p-1.5 lg:p-2 rounded-lg">
              <GuaGraphic lines={data.lines} changingLines={data.changingLines} />
              <div className="vertical-text text-sm lg:text-base text-[#555] border-l border-gray-200 pl-1.5 lg:pl-2 h-[60px] lg:h-[80px] flex items-center select-none tracking-widest">
                {data.guaName}
              </div>
            </div>
          </div>

          {/* Right: Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg lg:text-2xl font-serif font-bold text-ink-900 mb-2 lg:mb-3 leading-snug line-clamp-2">
              <span className="text-[#C82E31] mr-1">求测：</span>{data.question}
            </h3>
            <p className="text-xs lg:text-sm text-[#666] mb-3 lg:mb-4 line-clamp-2 leading-relaxed">
              {data.background}
            </p>
            <div className="flex flex-wrap gap-1.5 lg:gap-2 mb-2 lg:mb-4">
              {data.tags.map((tag: string, idx: number) => (
                <span key={idx} className="text-[10px] lg:text-xs text-[#666] bg-gray-50 px-1.5 py-0.5 lg:px-2 lg:py-0.5 rounded border border-gray-100">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 lg:mt-4 pt-2 lg:pt-3 border-t border-ink-200/40 text-[10px] lg:text-xs text-ink-500">
          <div className="flex items-center gap-3 lg:gap-5">
            <span>{data.stats.views} 浏览</span>
            <span>{data.stats.comments} 断语</span>
            <span className="hidden lg:inline">{data.stats.favorites} 收藏</span>
          </div>
          <span className="text-ink-400">{data.publishTime}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// 组件：高级筛选内容 (AdvancedFilterContent)
// -----------------------------------------------------------------------------
const AdvancedFilterContent = ({ selectedGuaTypes, toggleGuaType, selectedMethods, toggleMethod, filterOptions, setFilterOptions, onReset, onClose }: FilterPanelProps) => (
  <div className="space-y-6">
    <div>
      <h4 className="text-sm font-bold text-gray-800 mb-3">按卦理特征</h4>
      <div className="flex flex-wrap gap-2">
        {GUA_TYPES.map(type => (
          <button
            key={type}
            onClick={() => toggleGuaType(type)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
              selectedGuaTypes.includes(type)
                ? 'bg-ink-100 text-ink-800 border-ink-300'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>

    <div>
      <h4 className="text-sm font-bold text-gray-800 mb-3">按起卦方式</h4>
      <div className="flex flex-wrap gap-2">
        {METHODS.map(m => (
          <button
            key={m}
            onClick={() => toggleMethod(m)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
              selectedMethods.includes(m)
                ? 'bg-ink-100 text-ink-800 border-ink-300'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>

    <div className="border-t border-gray-100 pt-4">
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between text-sm text-gray-700">
          <span>只看认证卦师</span>
          <input 
            type="checkbox" 
            checked={filterOptions.verifiedOnly}
            onChange={e => setFilterOptions({...filterOptions, verifiedOnly: e.target.checked})}
            className="accent-[#C82E31] w-5 h-5"
          />
        </label>
        <label className="flex items-center justify-between text-sm text-gray-700">
          <span>只看我的关注</span>
          <input 
            type="checkbox"
            checked={filterOptions.followingOnly}
            onChange={e => setFilterOptions({...filterOptions, followingOnly: e.target.checked})}
            className="accent-[#C82E31] w-5 h-5"
          />
        </label>
      </div>
    </div>

    <div className="flex gap-3 pt-4">
      <Button variant="outline" className="flex-1" onClick={onReset}>重置</Button>
      <Button className="flex-1 bg-[#C82E31] hover:bg-[#A61B1F] text-white" onClick={onClose}>确定</Button>
    </div>
  </div>
)

// -----------------------------------------------------------------------------
// 组件：筛选面板 (FilterPanel) - 响应式重构
// -----------------------------------------------------------------------------
const FilterPanel = (props: any) => {
  const {
    activeTab, setActiveTab,
    selectedCategories, toggleCategory,
    selectedStatuses, toggleStatus,
    selectedGuaTypes, selectedMethods, filterOptions, setFilterOptions // for badge count
  } = props

  const [showPCAdvanced, setShowPCAdvanced] = useState(false)
  const advancedRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭 PC 下拉
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!advancedRef.current || advancedRef.current.contains(event.target as Node)) return
      setShowPCAdvanced(false)
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [])

  const activeFiltersCount = selectedGuaTypes.length + selectedMethods.length + (filterOptions.verifiedOnly ? 1 : 0) + (filterOptions.followingOnly ? 1 : 0)

  // 处理重置
  const handleReset = () => {
     setFilterOptions({ verifiedOnly: false, followingOnly: false })
     // 需要父组件传递清除数组的方法，这里简化
     // 实际开发建议把 setFilterState 传进来
  }

  const router = useRouter(); // 需要引入 useRouter

  return (
    <Card className="bg-white/95 border border-ink-200/50 shadow-sm sticky top-0 z-20 backdrop-blur-md">
      <CardContent className="p-0 lg:p-4">
        
        {/* Mobile: Tabs Scroll */}
        <div className="lg:hidden border-b border-gray-100 overflow-x-auto scrollbar-hide px-4 py-2 flex items-center gap-6 bg-white">
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

        {/* Desktop: Tabs */}
        <div className="hidden lg:flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
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

        {/* Filters Row */}
        <div className="flex items-center gap-2 px-4 py-3 lg:px-0 lg:py-0">
          
          {/* Scrollable Chips */}
          <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-2 pr-2">
            {/* Category Chips */}
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = chip.id === 'all' ? selectedCategories.length === 0 : selectedCategories.includes(chip.id)
              return (
                <button
                  key={chip.id}
                  onClick={() => toggleCategory(chip.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                    isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-transparent'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
            <div className="w-px h-4 bg-gray-300 mx-1 shrink-0" />
            {STATUS_CHIPS.map((chip) => {
              const isSelected = selectedStatuses.includes(chip.id)
              return (
                <button
                  key={chip.id}
                  onClick={() => toggleStatus(chip.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                    isSelected 
                      ? (chip.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' : chip.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200')
                      : 'bg-gray-50 text-gray-600 border-transparent'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Advanced Filter Trigger */}
          <div className="shrink-0 relative border-l border-gray-100 pl-2">
            
            {/* Mobile: Sheet Trigger */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className={`p-2 rounded-full border transition-all ${activeFiltersCount > 0 ? 'bg-red-50 border-red-200 text-[#C82E31]' : 'bg-white border-gray-200 text-gray-600'}`}>
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C82E31] rounded-full border border-white" />
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl p-6 pb-10 bg-white">
                  <SheetHeader className="mb-4 text-left">
                    <SheetTitle>高级筛选</SheetTitle>
                  </SheetHeader>
                  <AdvancedFilterContent {...props} onClose={() => document.body.click()} onReset={handleReset} />
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop: Dropdown Trigger */}
            <div className="hidden lg:block relative" ref={advancedRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowPCAdvanced(!showPCAdvanced) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  showPCAdvanced || activeFiltersCount > 0
                    ? 'bg-gray-100 text-gray-900 border-gray-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-3.5 w-3.5" /> 筛选
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-[#C82E31] text-white text-[10px] rounded-full">{activeFiltersCount}</span>
                )}
              </button>
              
              {showPCAdvanced && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">高级选项</h3>
                    <button onClick={() => setShowPCAdvanced(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                  </div>
                  <AdvancedFilterContent {...props} onClose={() => setShowPCAdvanced(false)} onReset={handleReset} />
                </div>
              )}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// 侧边栏 (PC Only)
// -----------------------------------------------------------------------------
const Sidebar = () => (
  <div className="space-y-6">
    <Card className="bg-white border border-ink-200/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#C82E31]" />
          <h3 className="text-sm font-semibold text-gray-800">热门话题</h3>
        </div>
        <div className="space-y-3">
            {[{n:'事业',c:234}, {n:'感情',c:189}, {n:'财运',c:156}].map((t,i) => (
              <div key={i} className="flex justify-between items-center text-sm group cursor-pointer">
                <span className="text-gray-700 group-hover:text-[#C82E31] transition-colors">#{t.n}</span>
                <span className="text-gray-400 text-xs">{t.c} 讨论</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  </div>
)

// -----------------------------------------------------------------------------
// 移动端发布按钮 (悬浮)
// -----------------------------------------------------------------------------
const MobileFab = () => (
  <button className="lg:hidden fixed bottom-6 right-6 w-12 h-12 bg-[#C82E31] text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-[#A61B1F] active:scale-90 transition-all">
    <Plus className="h-6 w-6" />
  </button>
)

// -----------------------------------------------------------------------------
// 页面入口
// -----------------------------------------------------------------------------

export default function CasesPage() {
  const [activeTab, setActiveTab] = useState('recommended')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedGuaTypes, setSelectedGuaTypes] = useState<string[]>([])
  const [selectedMethods, setSelectedMethods] = useState<string[]>([])
  const [filterOptions, setFilterOptions] = useState({ verifiedOnly: false, followingOnly: false })

  const toggleSelection = (current: string[], setter: any, value: string, isExclusiveAll = false) => {
    if (isExclusiveAll && value === 'all') { setter([]); return }
    setter(current.includes(value) ? current.filter(i => i !== value) : [...current, value])
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen bg-[#f5f5f7] font-sans text-gray-800">
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
                selectedCategories={selectedCategories} 
                toggleCategory={(id: string) => toggleSelection(selectedCategories, setSelectedCategories, id, true)}
                selectedStatuses={selectedStatuses} 
                toggleStatus={(id: string) => toggleSelection(selectedStatuses, setSelectedStatuses, id)}
                selectedGuaTypes={selectedGuaTypes} 
                toggleGuaType={(val: string) => toggleSelection(selectedGuaTypes, setSelectedGuaTypes, val)}
                selectedMethods={selectedMethods} 
                toggleMethod={(val: string) => toggleSelection(selectedMethods, setSelectedMethods, val)}
                filterOptions={filterOptions} setFilterOptions={setFilterOptions}
              />

              <div className="space-y-3 lg:space-y-4 px-2 lg:px-0">
                {MOCK_CASES.map((caseItem) => (
                  <CaseCard key={caseItem.id} data={caseItem} />
                ))}
                {/* Load More Hint */}
                <div className="text-center py-6 text-xs text-gray-400">
                  没有更多内容了
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:flex-[0_0_28%]">
              <div className="sticky top-24">
                <Sidebar />
              </div>
            </div>
          </div>
        </div>
        <MobileFab />
      </div>
    </>
  )
}