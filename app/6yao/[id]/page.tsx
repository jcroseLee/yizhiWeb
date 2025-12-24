'use client'

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown, ChevronUp,
  CloudFog, Download,
  Moon,
  RotateCcw, Save, Share2, Sparkles,
  Sun,
  Wand2 // 已修复：确保导入 Wand2
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { ToastProviderWrapper } from '@/lib/components/ToastProviderWrapper'
import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import {
  LINE_LABELS, RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId
} from '@/lib/constants/divination'
import { HEXAGRAM_FULL_NAMES } from '@/lib/constants/liuyaoConstants'
import { useToast } from '@/lib/hooks/use-toast'
import { getDivinationRecordById, saveDivinationRecord } from '@/lib/services/profile'
import { buildLineDisplay } from '@/lib/utils/divinationLines'
import { buildChangedLines as buildChangedLinesUtil } from '@/lib/utils/divinationLineUtils'
import { calculateChangedLineDetails, calculateLineDetails, getExtendedShenSha, getFuShenAndGuaShen, getHexagramFullInfo, getHexagramNature, type LineDetail, type ShenShaItem } from '@/lib/utils/liuyaoDetails'
import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateStringWithoutYear } from '@/lib/utils/lunar'
import { solarTermTextFrom } from '@/lib/utils/solarTerms'

const GLOBAL_STYLES = `
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  .font-serif-sc { font-family: "Noto Serif SC", "Songti SC", serif; }
  .writing-vertical { writing-mode: vertical-rl; }
`

// --- 纯函数工具类 ---
const isUUID = (str: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const buildChangedLines = buildChangedLinesUtil
const getFullHexagramName = (binaryKey: string, shortName: string): string => HEXAGRAM_FULL_NAMES[binaryKey] || shortName

// --- 子组件: 爻行显示 (核心修改) ---

interface HexagramLineProps {
  line: { barType: 'yin' | 'yang', isChanging: boolean, status: string }
  detail?: LineDetail
  changedDetail?: LineDetail
  isChanged?: boolean
  fuShen?: string
  guaShen?: string
}

const HexagramLine = React.memo(({ line, detail, changedDetail, isChanged = false, fuShen, guaShen }: HexagramLineProps) => {
  const displayType = isChanged 
    ? (line.isChanging ? (line.barType === 'yang' ? 'yin' : 'yang') : line.barType)
    : line.barType

  const lineColor = line.isChanging ? 'bg-[#C82E31]' : 'bg-stone-800'
  const isYang = displayType === 'yang'
  
  // 高度：移动端 h-10，PC 端严格恢复 h-14
  const heightClass = "h-10 lg:h-14"

  // 1. 变卦显示模式 (右侧)
  if (isChanged) {
    const opacityClass = line.isChanging ? 'opacity-100 text-stone-800' : 'opacity-30 grayscale text-stone-400'
    
    return (
      <div className={`flex flex-col ${heightClass} border-b border-dashed border-stone-100/50 justify-center`}>
        <div className="flex items-center">
          
          {/* 1. 爻线图形 */}
          {/* 移动端 w-16，PC 端严格恢复 w-16 (保持与左侧本卦对齐) */}
          <div className="w-16 h-4 flex items-center justify-between relative shrink-0 mr-1 lg:mr-0">
            {isYang ? (
              <div className={`w-full lg:w-full h-[5px] lg:h-[8px] rounded-[1px] lg:rounded-[2px] shadow-sm ${lineColor}`} />
            ) : (
              <>
                <div className={`w-[42%] lg:w-[42%] h-[5px] lg:h-[8px] rounded-[1px] lg:rounded-[2px] shadow-sm ${lineColor}`} />
                <div className={`w-[42%] lg:w-[42%] h-[5px] lg:h-[8px] rounded-[1px] lg:rounded-[2px] shadow-sm ${lineColor}`} />
              </>
            )}
          </div>
          
          {/* 2. 变卦文字 */}
          {/* PC端：ml-4 (间距恢复) */}
          <div className={`flex flex-col justify-center ml-2 lg:ml-4 ${opacityClass}`}>
            <span className="font-bold font-serif text-stone-700 text-xs lg:text-sm leading-none mb-0.5">
              {changedDetail?.relationShort}
            </span>
            <span className="font-serif text-[10px] lg:text-xs text-stone-500 leading-none scale-90 lg:scale-100 origin-left">
              {changedDetail?.stem}{changedDetail?.branch}{changedDetail?.element}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 2. 本卦显示模式 (左侧)
  return (
    <div className={`relative group hover:bg-stone-50/80 transition-colors rounded-lg border-b border-dashed border-stone-100 ${heightClass} flex items-center justify-end lg:justify-start -mx-1 lg:-mx-3 px-1 lg:px-3`}>
      
      <div className="flex items-center w-full lg:w-auto">
        
        {/* 第一列：六兽 */}
        {/* 移动端：隐藏 (hidden)，PC端：显示 (lg:flex, w-8) - 严格恢复 */}
        <div className="hidden lg:flex w-8 flex-col items-center justify-center shrink-0 border-r border-stone-100 pr-2 mr-3 h-8">
           <span className="text-xs font-bold text-stone-500 font-serif whitespace-nowrap">
             {detail?.animalShort}
           </span>
        </div>

        {/* 第二列：文字信息 (六亲+干支) */}
        {/* 移动端 w-20，PC端 w-28 - 严格恢复 */}
        <div className="w-20 lg:w-28 flex flex-col items-end lg:justify-center shrink-0 mr-1 lg:mr-2">
           {/* 六亲 */}
           <div className="flex items-baseline gap-1 lg:gap-2">
             <span className="font-bold text-stone-800 font-serif text-sm lg:text-[15px] leading-none mb-0.5 lg:mb-0">
               {detail?.relationShort}
             </span>
             {/* PC端干支 */}
             <span className="text-stone-600 font-serif text-[10px] lg:text-sm leading-none scale-95 lg:scale-100 origin-right lg:origin-left">
                {detail?.stem}{detail?.branch}<span className="text-stone-400 ml-0.5 text-[9px] lg:text-xs">{detail?.element}</span>
             </span>
           </div>
           
           {/* 移动端：伏神/卦身/世应 (挤在一起) */}
           <div className="lg:hidden flex items-center gap-1 mt-0.5">
              {detail?.isShi && <span className="text-[9px] text-white bg-[#C82E31] px-0.5 rounded-[2px] leading-none scale-90">世</span>}
              {detail?.isYing && <span className="text-[9px] text-stone-500 border border-stone-200 px-0.5 rounded-[2px] leading-none scale-90">应</span>}
              {fuShen && <span className="text-[8px] text-[#C82E31] font-serif scale-75 origin-right">伏:{fuShen}</span>}
           </div>

           {/* PC端：伏神/卦身 (独立一行显示，红色高亮 - 严格恢复) */}
           <div className="hidden lg:flex items-center gap-2 mt-0.5">
               {fuShen && (
                 <span className="text-[10px] text-[#C82E31] font-serif tracking-wide">
                   伏神: {fuShen}
                 </span>
               )}
               {guaShen && (
                 <span className="text-[10px] text-stone-400 font-serif scale-90 origin-left">
                   身: {guaShen}
                 </span>
               )}
           </div>
        </div>

        {/* 第三列：爻线图形 */}
        {/* 移动端 w-16，PC端 w-24 - 严格恢复 */}
        <div className="relative flex items-center justify-center w-16 lg:w-24 shrink-0">
          <div className="w-12 lg:w-20 h-4 flex items-center justify-between relative cursor-default">
            {isYang ? (
              <div className={`w-full h-[5px] lg:h-[8px] rounded-[1px] lg:rounded-[2px] shadow-sm ${lineColor} opacity-90`} />
            ) : (
              <>
                <div className={`w-[42%] h-[5px] lg:h-[8px] rounded-[1px] lg:rounded-[2px] shadow-sm ${lineColor} opacity-90`} />
                <div className={`w-[42%] h-[5px] lg:h-[8px] rounded-[1px] lg:rounded-[2px] shadow-sm ${lineColor} opacity-90`} />
              </>
            )}
          </div>
        </div>

        {/* 第四列：PC端专属状态栏 (世应/动爻标记 - 严格恢复) */}
        <div className="hidden lg:flex items-center gap-2 ml-3 w-12 shrink-0">
           {/* 世应 */}
           <div className="w-5 flex justify-center">
             {detail?.isShi && (
               <div className="w-5 h-5 flex items-center justify-center border border-[#C82E31] rounded-[4px] bg-[#C82E31]/5 text-[#C82E31]">
                 <span className="text-[10px] font-bold font-serif leading-none mt-[1px]">世</span>
               </div>
             )}
             {detail?.isYing && (
               <div className="w-5 h-5 flex items-center justify-center border border-stone-300 rounded-[4px] bg-stone-50 text-stone-500">
                 <span className="text-[10px] font-serif leading-none mt-[1px]">应</span>
               </div>
             )}
           </div>

           {/* 动爻 */}
           <div className="w-4 flex justify-center">
             {line.isChanging && (
                <span className="text-xs font-serif text-[#C82E31] animate-pulse font-bold">
                  {line.barType === 'yin' ? '✕' : '○'}
                </span>
             )}
           </div>
        </div>

        {/* 移动端 动爻标记 (浮动在右侧) */}
        <div className="lg:hidden w-4 flex justify-center ml-1">
             {line.isChanging && (
                <span className="text-xs font-serif text-[#C82E31] font-bold">
                  {line.barType === 'yin' ? '✕' : '○'}
                </span>
             )}
        </div>

      </div>
    </div>
  )
})
HexagramLine.displayName = 'HexagramLine'

// --- 子组件: 神煞列表 ---
const ShenShaList = ({ list }: { list: ShenShaItem[] }) => (
  <div className="flex flex-wrap gap-2 lg:gap-4 text-xs">
    {list.map((ss, idx) => (
      <span key={idx} className="text-stone-500 font-serif flex items-center bg-white px-2 py-1 rounded border border-stone-100 shadow-sm">
         <span className="text-stone-400 mr-1.5">{ss.name}</span>
         <span className="font-medium text-stone-700">{ss.value}</span>
      </span>
    ))}
  </div>
)

// --- 子组件: 功能按钮 (移动端专用) ---
const ActionButton = ({ icon: Icon, label, onClick, disabled = false, active = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${
      active 
        ? 'bg-[#C82E31]/5 border-[#C82E31] text-[#C82E31]' 
        : 'bg-white border-stone-100 text-stone-600 hover:bg-stone-50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'shadow-sm'}`}
  >
    <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
)

// --- 主内容组件 ---
function ResultPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const resultId = params.id as string
  const from = searchParams.get('from')
  
  const [payload, setPayload] = useState<StoredDivinationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [showShenSha, setShowShenSha] = useState(false)

  // 数据加载
  useEffect(() => {
    if (typeof window === 'undefined' || !resultId) return
    const loadResult = async () => {
      try {
        if (isUUID(resultId)) {
          const record = await getDivinationRecordById(resultId, false)
          if (record) {
            const originalJson = typeof record.original_json === 'string' ? JSON.parse(record.original_json) : record.original_json || {}
            const changedJson = typeof record.changed_json === 'string' ? JSON.parse(record.changed_json) : record.changed_json || {}
            setPayload({
              question: record.question || '',
              divinationTimeISO: record.divination_time,
              divinationMethod: record.method,
              lines: record.lines,
              changingFlags: record.changing_flags,
              result: {
                originalKey: record.original_key,
                changedKey: record.changed_key,
                original: originalJson,
                changed: changedJson,
                changingLines: record.changing_flags.map((f, i) => f ? i + 1 : 0).filter(Boolean),
              },
            })
            setIsSaved(true)
            setSavedRecordId(resultId)
          } else {
            router.push('/6yao')
          }
        } else {
          const stored = localStorage.getItem(RESULTS_LIST_STORAGE_KEY)
          if (stored) {
            const list = JSON.parse(stored) as StoredResultWithId[]
            const found = list.find((r: StoredResultWithId) => r.id === resultId)
            if (found) setPayload(found)
            else {
               const legacy = localStorage.getItem('latestDivinationResult')
               if(legacy) setPayload(JSON.parse(legacy))
               else router.push('/6yao')
            }
          } else {
             router.push('/6yao')
          }
        }
      } catch (e) {
        console.error("Failed to load result:", e)
        router.push('/6yao')
      } finally {
        setLoading(false)
      }
    }
    loadResult()
  }, [router, resultId])

  const calculatedData = useMemo(() => {
    if (!payload) return null
    const originalLineDisplay = buildLineDisplay(payload.lines, LINE_LABELS, payload.changingFlags)
    const changedLinesStr = buildChangedLines(payload.lines, payload.changingFlags)
    const changedLineDisplay = buildLineDisplay(changedLinesStr, LINE_LABELS)
    const hasMovingLines = payload.changingFlags.some(flag => flag)
    const date = new Date(payload.divinationTimeISO)
    const ganZhiInfo = getGanZhiInfo(date)
    const stems = ganZhiInfo.stems || []
    const branches = ganZhiInfo.branches || []
    if (stems.length < 3) return null
    const shenShaList = getExtendedShenSha(stems[2].char, branches[2].char, branches[1].char, branches[0].char)
    const kongWang = getKongWangPairForStemBranch(stems[2].char, branches[2]?.char || '')
    const lineDetails = calculateLineDetails(payload.result.originalKey, payload.lines, stems[2].char)
    const changedLineDetails = calculateChangedLineDetails(
      payload.result.changedKey, changedLinesStr, payload.result.originalKey, payload.lines, payload.changingFlags
    )
    const originalNature = getHexagramNature(payload.result.originalKey, payload.result.original.name)
    const changedNature = getHexagramNature(payload.result.changedKey, payload.result.changed.name)
    const originalFullInfo = getHexagramFullInfo(payload.result.originalKey)
    const changedFullInfo = getHexagramFullInfo(payload.result.changedKey)
    const { fuShenMap, guaShen, guaShenLineIndex } = getFuShenAndGuaShen(
      payload.result.originalKey, lineDetails, originalNature.nature, originalNature.element
    )

    return {
      hasMovingLines, date, stems, branches, solarTerm: solarTermTextFrom(date), shenShaList, kongWang, 
      lineDetails, changedLineDetails, originalLineDisplayReversed: originalLineDisplay.slice().reverse(), changedLineDisplayReversed: changedLineDisplay.slice().reverse(),
      originalNature, changedNature, originalFullInfo, changedFullInfo, fuShenMap, guaShen, guaShenLineIndex
    }
  }, [payload])

  const saveRecordToCloud = useCallback(async (showToast: boolean = true) => {
    if (!payload || saving || isSaved || !calculatedData) return savedRecordId || (isUUID(resultId) ? resultId : null)
    setSaving(true)
    try {
      const res = await saveDivinationRecord({
        ...payload,
        result: {
           ...payload.result,
           original: { ...payload.result.original, kongWang: calculatedData.kongWang }
        }
      })
      if (res.success) {
        setIsSaved(true)
        setSavedRecordId(res.recordId || null)
        if (showToast) toast({ title: '保存成功' })
        return res.recordId || null
      } else {
        if (showToast) toast({ title: '保存失败', description: res.message, variant: 'destructive' })
        return null
      }
    } catch {
      if (showToast) toast({ title: '保存失败', variant: 'destructive' })
      return null
    } finally {
      setSaving(false)
    }
  }, [payload, saving, isSaved, savedRecordId, resultId, toast, calculatedData])

  const handlePublish = async () => {
    let recordIdToUse = savedRecordId || (isUUID(resultId) ? resultId : null)
    if (!isSaved) recordIdToUse = await saveRecordToCloud(false)
    if (recordIdToUse) router.push(`/community/publish?tab=divination&recordId=${recordIdToUse}`)
    else toast({ title: '无法发布', description: '无法获取排盘记录ID', variant: 'destructive' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-400">加载中...</div>
  if (!payload || !calculatedData) return null

  const { 
    hasMovingLines, date, stems, branches, solarTerm, shenShaList, kongWang, 
    lineDetails, changedLineDetails, originalLineDisplayReversed, changedLineDisplayReversed,
    originalNature, changedNature, originalFullInfo, changedFullInfo, fuShenMap, guaShen, guaShenLineIndex
  } = calculatedData

  return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="min-h-screen bg-[#f5f5f7] paper-texture flex justify-center p-0 lg:p-8 font-sans">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            {/* 上半部分 */}
            <Card className="border-none shadow-none lg:shadow-sm bg-white min-h-[800px] relative overflow-hidden flex flex-col rounded-none lg:rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#C82E31]/80"></div>
              <div className="p-4 sm:p-8 lg:p-12 flex-1 pb-32 lg:pb-12">
                
                {/* 1. 标题区 */}
                <div className="mb-6 lg:mb-8 mt-2 lg:mt-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <span className="text-[10px] font-medium text-[#C82E31] bg-[#C82E31]/10 border border-[#C82E31]/20 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                        所占事项
                      </span>
                      <span className="text-[10px] sm:text-xs text-stone-400 font-mono tracking-wider truncate">
                        {['手动摇卦', '自动摇卦', '手工指定'][payload.divinationMethod]} 
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-stone-800 leading-snug tracking-tight break-words">
                      {payload.question || '诚心求占此事吉凶'}
                    </h1>
                  </div>
                </div>

                {/* 2. 信息区 (PC还原 / 移动适配) */}
                <div className="bg-stone-50/70 rounded-xl border border-stone-200/60 p-4 lg:p-5 mb-8 lg:mb-12">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
                    
                    {/* 左侧：日期详细信息 */}
                    <div className="flex flex-col gap-2 lg:gap-3 w-full lg:w-auto">
                       <div className="flex items-center gap-2 lg:gap-3 text-xs sm:text-base text-stone-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C82E31]" />
                          <span>{formatDateTime(payload.divinationTimeISO)}</span>
                       </div>
                       
                       <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs text-stone-500">
                          <div className="flex items-center gap-1"><Moon className="w-3 h-3 text-stone-400" /><span className="font-serif tracking-wide">{getLunarDateStringWithoutYear(date)}</span></div>
                          <div className="w-px h-2.5 bg-stone-300"></div>
                          <div className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-500/70" /><span className="font-serif">{solarTerm.split(' ~ ')[0]}</span></div>
                          <div className="w-px h-2.5 bg-stone-300"></div>
                          <div className="flex items-center gap-1"><CloudFog className="w-3 h-3 text-stone-400" /><span className="bg-stone-200/50 px-1 py-0.5 rounded text-stone-600">空:{kongWang}</span></div>
                       </div>
                       
                       <button onClick={() => setShowShenSha(!showShenSha)} className="flex items-center gap-1 text-[10px] sm:text-xs text-stone-400 hover:text-[#C82E31] transition-colors cursor-pointer w-fit mt-1 group">
                          <span className="border-b border-dashed border-stone-300 group-hover:border-[#C82E31] pb-0.5">{showShenSha ? '收起神煞' : '查看神煞互参'}</span>
                          {showShenSha ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                       </button>
                    </div>

                    {/* 右侧：四柱 (PC端样式还原：Label在上，Char在下，日柱红框) */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:gap-4 shrink-0 w-full lg:w-auto overflow-x-auto lg:overflow-visible lg:border-l lg:border-stone-200 lg:pl-8 lg:py-1">
                      {/* 移动端横排 */}
                      <div className="flex lg:hidden w-full justify-between items-center gap-2 border-t border-stone-100 pt-3">
                         {['年', '月', '日', '时'].map((label, i) => (
                           <div key={i} className={`flex flex-col items-center gap-1 ${label === '日' ? 'relative -top-0.5' : ''}`}>
                              <span className="text-[10px] text-stone-400">{label}</span>
                              <div className={`flex flex-col items-center py-2 px-3 rounded-lg border ${label === '日' ? 'border-[#C82E31]/40 bg-red-50/20' : 'bg-white border-stone-200'}`}>
                                <span className={`text-base font-serif font-bold leading-none mb-1 ${label === '日' ? 'text-[#C82E31]' : 'text-stone-700'}`}>{stems[i]?.char}</span>
                                <span className={`text-base font-serif font-bold leading-none ${label === '日' ? 'text-[#C82E31]' : 'text-stone-700'}`}>{branches[i]?.char}</span>
                              </div>
                           </div>
                         ))}
                      </div>

                      {/* PC端竖排 (严格还原) */}
                      <div className="hidden lg:flex items-start gap-4">
                        {['年', '月', '日', '时'].map((label, i) => {
                          const isDay = label === '日';
                          return (
                            <div key={i} className={`flex flex-col items-center gap-2 group ${isDay ? 'relative -top-1' : ''}`}>
                              <span className="text-xs text-stone-400 scale-90">{label}</span>
                              <div className={`
                                 flex flex-col items-center py-2 px-2.5 rounded-lg border writing-vertical
                                 ${isDay 
                                   ? 'bg-white border-[#C82E31]/30 shadow-[0_2px_8px_rgba(200,46,49,0.08)]' 
                                   : 'bg-transparent border-transparent group-hover:bg-stone-100/50'}
                              `}>
                                <span className={`text-lg font-serif leading-tight mb-1 ${isDay ? 'text-[#C82E31] font-bold' : 'text-stone-700'}`}>
                                  {stems[i]?.char}
                                </span>
                                <span className={`text-lg font-serif leading-tight ${isDay ? 'text-[#C82E31] font-bold' : 'text-stone-700'}`}>
                                  {branches[i]?.char}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {showShenSha && <div className="mt-4 pt-4 border-t border-stone-200 border-dashed animate-in fade-in slide-in-from-top-1 duration-200"><ShenShaList list={shenShaList} /></div>}
                </div>

                {/* 3. 卦象主体 (PC还原大间距) */}
                <div className="flex flex-row items-stretch justify-center gap-2 md:gap-8 lg:gap-16 mb-12 lg:mb-16 relative w-full overflow-hidden">
                  
                  {/* 本卦 (占比 47%) */}
                  <div className="flex-1 w-[47%] min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-4 lg:mb-8 text-right sm:text-left h-auto sm:h-6 pr-1 sm:pr-0 border-r-4 sm:border-r-0 sm:border-l-4 border-stone-800 sm:pl-2">
                      <h2 className="text-base sm:text-2xl font-bold text-stone-800 font-serif tracking-wide leading-none truncate">
                        {originalFullInfo.fullName}
                      </h2>
                      <span className="text-[10px] sm:text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full block sm:inline">
                        {originalNature.nature}宫
                      </span>
                    </div>
                    <div className="flex flex-col gap-0 border-r border-dashed border-stone-200 sm:border-none pr-1 sm:pr-0">
                      {originalLineDisplayReversed.map((line, i) => {
                        const detailIndex = 5 - i
                        return <HexagramLine key={`org-${i}`} line={line} detail={lineDetails[detailIndex]} changedDetail={changedLineDetails[detailIndex]} fuShen={fuShenMap && detailIndex in fuShenMap ? (fuShenMap as Record<number, string>)[detailIndex] : undefined} guaShen={guaShenLineIndex === detailIndex ? guaShen : undefined} />
                      })}
                    </div>
                  </div>

                  {/* 中轴线/箭头 (移动端显示向下箭头，PC端隐藏) */}
                  <div className={`flex flex-col items-center justify-center pt-8 sm:pt-28 w-[6%] sm:w-[10%] shrink-0 ${!hasMovingLines ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="bg-stone-50 rounded-full p-0.5 sm:p-2 border border-stone-100 shadow-sm z-10">
                      {/* 移动端小箭头 */}
                      <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5 text-stone-400 lg:hidden" />
                      {/* PC端大箭头 (PC样式恢复：原本是隐藏的，或者有大间距) */}
                      <ArrowRight className="w-6 h-6 text-stone-400 hidden lg:block" />
                    </div>
                    {/* 移动端虚线 */}
                    <div className="h-full w-px border-l border-dashed border-stone-200 -mt-2 mb-2 sm:hidden"></div>
                  </div>

                  {/* 变卦 (占比 47%) */}
                  <div className={`flex-1 w-[47%] min-w-0 ${!hasMovingLines ? 'opacity-30 grayscale' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-4 lg:mb-8 pl-2 border-l-4 border-stone-300 h-auto sm:h-6">
                      <h2 className="text-base sm:text-2xl font-bold text-stone-600 font-serif tracking-wide leading-none truncate">
                        {hasMovingLines ? changedFullInfo.fullName : '变卦'}
                      </h2>
                      {hasMovingLines && (
                        <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full block sm:inline">
                           {changedNature.nature}宫
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0 pl-1 sm:pl-0">
                       {hasMovingLines ? (
                         changedLineDisplayReversed.map((line, i) => {
                           const detailIndex = 5 - i
                           return <HexagramLine key={`chg-${i}`} line={line} detail={lineDetails[detailIndex]} changedDetail={changedLineDetails[detailIndex]} isChanged={true} />
                         })
                       ) : (
                         Array(6).fill(0).map((_, i) => (
                           <div key={`empty-${i}`} className="flex flex-col h-10 lg:h-14 justify-center border-b border-dashed border-stone-100/50">
                             <div className="flex items-center gap-2 opacity-10">
                               <div className="w-8 lg:w-16 h-[5px] lg:h-[8px] bg-stone-400 rounded-[2px]"></div>
                             </div>
                           </div>
                         ))
                       )}
                    </div>
                  </div>
                </div>

                {/* 4. 卦辞区域 (书签式 - PC还原) */}
                <div className="relative mb-8 bg-[#faf9f6] border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm overflow-hidden">
                   <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#C82E31] rounded-l-lg"></div>
                   <div className="absolute -right-4 -bottom-4 opacity-[0.05] pointer-events-none select-none"><span className="font-serif text-9xl text-stone-900 leading-none">易</span></div>
                   
                   <div className={`relative z-10 pl-4 lg:pl-6 ${hasMovingLines ? 'grid lg:grid-cols-2 gap-8 lg:gap-10' : 'max-w-4xl'}`}>
                      {/* 本卦辞 */}
                      <div className="mb-6 lg:mb-0">
                         <div className="flex items-center gap-3 mb-4">
                            <span className="w-2 h-2 rounded-full bg-[#C82E31]"></span>
                            <h4 className="font-serif font-bold text-stone-800 text-base lg:text-lg tracking-wide">
                              本卦 · {originalFullInfo.fullName}
                            </h4>
                         </div>
                         <p className="text-sm lg:text-base text-stone-600 font-serif leading-8 text-justify opacity-90">
                           {payload.result.original.interpretation}
                         </p>
                      </div>

                      {/* 变卦辞 */}
                      {hasMovingLines && (
                        <div className="border-t lg:border-t-0 lg:border-l border-stone-200/60 pt-6 lg:pt-0 lg:pl-10">
                           <div className="flex items-center gap-3 mb-4">
                              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                              <h4 className="font-serif font-bold text-stone-600 text-base lg:text-lg tracking-wide">
                                变卦 · {changedFullInfo.fullName}
                              </h4>
                           </div>
                           <p className="text-sm lg:text-base text-stone-500 font-serif leading-8 text-justify opacity-90">
                             {payload.result.changed.interpretation}
                           </p>
                        </div>
                      )}
                   </div>
                </div>

                {/* 5. 底部工具栏 (移动端专属 Grid) */}
                <div className="lg:hidden space-y-4 pb-8">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#C82E31] to-[#D94F4F] shadow-lg shadow-red-900/10 p-4">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Sparkles className="w-24 h-24 text-white -rotate-12 translate-x-4 -translate-y-4" /></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="text-white">
                        <h3 className="font-serif font-bold text-base flex items-center gap-2"><Wand2 className="w-4 h-4" /> AI 智能详批</h3>
                        <p className="text-[10px] text-red-50/90 mt-0.5">深度解析吉凶应期，准确率提升30%</p>
                      </div>
                      <Button className="bg-white text-[#C82E31] hover:bg-red-50 border-none font-bold text-xs h-8 px-4 rounded-full shadow-sm">立即分析</Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-400 mb-2 px-1 uppercase tracking-wider">工具箱</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <ActionButton icon={Save} label={isSaved ? "已保存" : "保存"} active={isSaved} onClick={() => saveRecordToCloud(true)} disabled={saving || isSaved} />
                      <ActionButton icon={Share2} label="发布" onClick={handlePublish} disabled={saving} />
                      <ActionButton icon={Download} label="存图" onClick={() => toast({ title: "功能开发中" })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-9 text-xs text-stone-600 border-stone-200 bg-white" onClick={() => router.back()}><ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> 返回</Button>
                    <Button variant="outline" className="flex-1 h-9 text-xs text-stone-600 border-stone-200 bg-white" onClick={() => router.push('/6yao')}><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> 重排</Button>
                  </div>
                </div>

              </div>
              {/* PC端底部装饰纹理 */}
              <div className="hidden lg:block h-2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </Card>
          </div>

          {/* 右侧工具栏 (桌面端保持不变) */}
          <div className="hidden lg:flex w-72 flex-col gap-4 shrink-0">
             <Card className="border-none shadow-md overflow-hidden relative group cursor-pointer bg-gradient-to-br from-[#C82E31] to-[#A61B1F]">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-16 h-16 text-white" /></div>
               <div className="relative p-6 text-white">
                 <div className="flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5" /><h3 className="font-bold font-serif text-lg">AI 智能详批</h3></div>
                 <p className="text-red-100 text-xs mb-4 leading-relaxed opacity-90">基于《增删卜易》古法，结合大模型深度推理，为您解析吉凶应期。</p>
                 <Button className="w-full bg-white text-[#C82E31] hover:bg-red-50 border-none font-bold shadow-sm h-9 text-xs">开始分析</Button>
               </div>
            </Card>
            <Card className="bg-white border-none shadow-sm p-3">
               <div className="flex flex-col gap-1">
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm" onClick={() => saveRecordToCloud(true)} disabled={saving || isSaved}>
                    <Save className={`w-4 h-4 ${isSaved ? 'text-green-600' : ''}`} /> {saving ? '保存中...' : isSaved ? '已保存到云端' : '保存到云端'}
                 </Button>
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm" onClick={handlePublish} disabled={saving}>
                    <Share2 className="w-4 h-4" /> {saving ? '保存中...' : '发布到社区'}
                 </Button>
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm"><Download className="w-4 h-4" /> 分享结果图</Button>
               </div>
            </Card>
            <div className="mt-8 text-center px-4 lg:px-0">
               <div className="flex flex-col gap-2">
                 {(from === 'community' || from === 'profile') && (
                   <Button variant="outline" className="w-full border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.back()}>
                     <ArrowLeft className="w-3.5 h-3.5" /> 返回上一页
                   </Button>
                 )}
                 <Button variant="outline" className="w-full border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.push('/6yao')}>
                   <RotateCcw className="w-3.5 h-3.5" /> 重新排盘
                 </Button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ResultPage() {
  return (
    <ToastProviderWrapper>
      <ResultPageContent />
    </ToastProviderWrapper>
  )
}