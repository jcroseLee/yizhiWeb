'use client'

import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import {
  Briefcase, CheckCircle2, Clock, Heart,
  Plus, Settings, Star, Users, X, XCircle
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const MAIN_TABS = [
  { id: 'recommended', label: '推荐', icon: undefined },
  { id: 'latest', label: '最新', icon: undefined },
  { id: 'hot', label: '热榜', icon: undefined },
  { id: 'featured', label: '精华', icon: '🏆' },
] as const

export const CATEGORY_CHIPS = [
  { id: 'all', label: '全部', icon: null },
  { id: 'career', label: '事业前程', icon: Briefcase },
  { id: 'love', label: '恋爱婚姻', icon: Heart },
  { id: 'wealth', label: '财运投资', icon: Star },
  { id: 'health', label: '疾病健康', icon: Users },
] as const

export const STATUS_CHIPS = [
  { id: 'verified-accurate', label: '已验·准', icon: CheckCircle2, color: 'green' },
  { id: 'verified-inaccurate', label: '已验·错', icon: XCircle, color: 'red' },
  { id: 'pending', label: '待反馈', icon: Clock, color: 'orange' },
] as const

export const GUA_TYPES = ['六冲卦', '六合卦', '静卦', '动卦', '伏吟', '反吟', '游魂', '归魂'] as const
export const METHODS = ['金钱课', '时间起卦', '报数起卦', '意念起卦'] as const

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FilterOptions {
  verifiedOnly: boolean
  followingOnly: boolean
}

export interface FilterPanelProps {
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
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function FilterPanel({
  activeTab,
  setActiveTab,
  selectedCategories,
  toggleCategory,
  selectedStatuses,
  toggleStatus,
  filterOptions,
  setFilterOptions,
  selectedGuaTypes,
  toggleGuaType,
  selectedMethods,
  toggleMethod,
}: FilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const advancedRef = useRef<HTMLDivElement>(null)
  
  useClickOutside(advancedRef, () => setShowAdvanced(false))

  const activeFiltersCount = selectedGuaTypes.length + selectedMethods.length + (filterOptions.verifiedOnly ? 1 : 0) + (filterOptions.followingOnly ? 1 : 0)

  return (
    <Card className="bg-white/95 border border-ink-200/50 shadow-sm relative z-20">
      <CardContent className="p-4">
        {/* 第一行：Tab 栏 */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex gap-6">
            {MAIN_TABS.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant="ghost"
                className={`text-sm font-semibold transition-colors pb-1 border-b-2 rounded-none h-auto px-0 ${
                  activeTab === tab.id ? 'text-gray-900 border-[#C82E31]' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.icon && <span className="mr-1">{tab.icon}</span>} {tab.label}
              </Button>
            ))}
          </div>
          <Button 
            variant="ghost"
            className="hidden lg:flex items-center gap-2 px-4 py-1.5 text-white rounded text-sm bg-[#C82E31] hover:bg-[#A61B1F] shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" /> 发布
          </Button>
        </div>

        {/* 第二行：胶囊筛选 + 高级筛选 */}
        {/* 修复关键点：使用 flex 布局，左侧滚动，右侧固定，避免 overflow 裁剪 absolute 弹窗 */}
        <div className="flex items-start gap-2">
          
          {/* 左侧：可滚动的筛选区 */}
          <div className="flex-1 overflow-x-auto scrollbar-hide pb-2">
            <div className="flex items-center gap-2">
              {/* 事类 */}
              {CATEGORY_CHIPS.map((chip) => {
                const Icon = chip.icon
                const isSelected = chip.id === 'all' ? selectedCategories.length === 0 : selectedCategories.includes(chip.id)
                return (
                  <Button
                    key={chip.id}
                    onClick={() => toggleCategory(chip.id)}
                    variant="ghost"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all h-auto ${
                      isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {chip.label}
                  </Button>
                )
              })}
              {/* 分割线 */}
              <div className="w-px h-6 bg-gray-300 mx-1 shrink-0" />
              {/* 状态 */}
              {STATUS_CHIPS.map((chip) => {
                const isSelected = selectedStatuses.includes(chip.id)
                const activeClass = chip.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                                    chip.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-orange-50 text-orange-700 border-orange-200'
                return (
                  <Button
                    key={chip.id}
                    onClick={() => toggleStatus(chip.id)}
                    variant="ghost"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all h-auto ${
                      isSelected ? activeClass : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {chip.icon && <chip.icon className="h-3 w-3" />}
                    {chip.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* 右侧：高级筛选按钮（固定不滚动） */}
          <div className="shrink-0 relative border-l border-gray-100 pl-2" ref={advancedRef}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setShowAdvanced(!showAdvanced);
              }}
              variant="ghost"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all h-auto ${
                showAdvanced || activeFiltersCount > 0
                  ? 'bg-gray-100 text-gray-900 border-gray-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              筛选
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#C82E31] text-white text-[0.625rem] rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* 高级筛选下拉面板 */}
            {showAdvanced && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">高级选项</h3>
                  <Button 
                    onClick={() => setShowAdvanced(false)} 
                    variant="ghost"
                    className="text-gray-400 hover:text-gray-600 h-auto p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* 卦理 */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-2">按卦理</h4>
                    <div className="flex flex-wrap gap-2">
                      {GUA_TYPES.map(type => (
                        <Button
                          key={type}
                          onClick={() => toggleGuaType(type)}
                          variant="ghost"
                          className={`px-2 py-1 rounded text-xs border h-auto ${
                            selectedGuaTypes.includes(type) ? 'bg-gray-100 border-gray-400 text-gray-900' : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 起卦方式 */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-2">按方式</h4>
                    <div className="flex flex-wrap gap-2">
                      {METHODS.map(m => (
                        <Button
                          key={m}
                          onClick={() => toggleMethod(m)}
                          variant="ghost"
                          className={`px-2 py-1 rounded text-xs border h-auto ${
                            selectedMethods.includes(m) ? 'bg-gray-100 border-gray-400 text-gray-900' : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 其它 */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                        <input 
                          type="checkbox" 
                          checked={filterOptions.verifiedOnly}
                          onChange={e => setFilterOptions({...filterOptions, verifiedOnly: e.target.checked})}
                          className="accent-[#C82E31] w-4 h-4 rounded"
                        />
                        认证卦师
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                        <input 
                          type="checkbox"
                          checked={filterOptions.followingOnly}
                          onChange={e => setFilterOptions({...filterOptions, followingOnly: e.target.checked})}
                          className="accent-[#C82E31] w-4 h-4 rounded"
                        />
                        我的关注
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

