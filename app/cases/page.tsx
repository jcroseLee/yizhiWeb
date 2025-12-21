'use client'

import TextType from '@/lib/components/TextType'
import { Card, CardContent } from '@/lib/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { useState } from 'react'
import type { CaseItem } from './components/CaseCard'
import CaseCard from './components/CaseCard'
import type { FilterOptions } from './components/FilterPanel'
import FilterPanel from './components/FilterPanel'

// -----------------------------------------------------------------------------
// 样式补丁 (Style Patch) - 确保样式生效
// -----------------------------------------------------------------------------
const styles = `
  /* 强制竖排文本样式 */
  .vertical-text {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.25em;
    font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif;
  }
  
  /* 隐藏滚动条但保留功能 */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* 印章样式 */
  .seal-stamp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: bold;
    color: #C82E31;
    border: 2px solid #C82E31;
    border-radius: 4px;
    transform: rotate(-5deg);
    background-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 1px rgba(200, 46, 49, 0.3) inset;
  }
  .seal-stamp-pending {
    color: #F59E0B;
    border-color: #F59E0B;
    box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3) inset;
  }
`;

// -----------------------------------------------------------------------------
// 类型与数据 (Types & Data)
// -----------------------------------------------------------------------------

// CaseItem 类型已导出到 CaseCard 组件中
// FilterPanel 相关常量和类型已导出到 FilterPanel 组件中

const MOCK_CASES: CaseItem[] = [
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
    question: '考虑投资某个项目，想通过占卜了解风险',
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
// Components
// -----------------------------------------------------------------------------

const Sidebar = () => {
  return (
    <div className="space-y-6">
      <Card className="mb-2 bg-white border border-ink-200/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#C82E31]" />
            <h3 className="text-sm font-semibold text-gray-800">热门话题</h3>
          </div>
          <div className="space-y-3">
             {[{n:'事业',c:234}, {n:'感情',c:189}, {n:'财运',c:156}].map((t,i) => (
               <div key={i} className="flex justify-between items-center text-sm">
                 <span className="text-gray-700">#{t.n}</span>
                 <span className="text-gray-400 text-xs">{t.c} 讨论</span>
               </div>
          ))}
        </div>
        </CardContent>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 主页面
// -----------------------------------------------------------------------------

export default function CasesPage() {
  const [activeTab, setActiveTab] = useState('recommended')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedGuaTypes, setSelectedGuaTypes] = useState<string[]>([])
  const [selectedMethods, setSelectedMethods] = useState<string[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ verifiedOnly: false, followingOnly: false })

  const toggleSelection = (current: string[], setter: (value: string[]) => void, value: string, isExclusiveAll = false) => {
    if (isExclusiveAll && value === 'all') { setter([]); return }
    setter(current.includes(value) ? current.filter(i => i !== value) : [...current, value])
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen font-sans text-gray-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-6 lg:py-10">
          
          <div className="flex items-start justify-between gap-8 mb-12 pt-10">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">实证易学 · 案例宝库</h1>
              <p className="text-gray-500 text-sm font-serif">
                <TextType 
                  text={["不语怪力乱神，但求卦理真知。", "在此见证每一次推演的现实回响。"]}
                  typingSpeed={150}
                  pauseDuration={1500}
                  showCursor={false}
                  as="span"
                />
              </p>
            </div>
            <div className="hidden lg:block">
              {/* 这里放插画 Image 组件 */}
            </div>
          </div>

          <div className="flex gap-6 lg:gap-8">
            <div className="flex-1 lg:flex-[0_0_70%] space-y-6">
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

              <div className="space-y-4">
                {MOCK_CASES.map((caseItem) => (
                  <CaseCard className="mb-2" key={caseItem.id} data={caseItem} />
                ))}
              </div>
            </div>

            <div className="hidden lg:block lg:flex-[0_0_28%]">
              <div className="sticky top-6">
                <Sidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}