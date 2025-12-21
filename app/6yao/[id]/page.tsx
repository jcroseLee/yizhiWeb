'use client'

import {
  ArrowRight, BookOpen,
  Calendar,
  ChevronDown, ChevronUp,
  CloudFog, Download,
  Moon,
  RotateCcw, Save, Share2, Sparkles,
  Sun
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

// --- 纯函数工具类 (Utility Functions) ---

const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const buildChangedLines = (lines: string[], flags: boolean[]) =>
  lines.map((line, index) => {
    if (!flags[index]) return line
    if (line.includes('X')) return '-- --' 
    if (line.includes('O')) return '-----' 
    return line.includes('-----') ? '-- --' : '-----'
  })

const getFullHexagramName = (binaryKey: string, shortName: string): string => {
  return HEXAGRAM_FULL_NAMES[binaryKey] || shortName
}

// --- 子组件: 爻行显示 (HexagramLine) ---

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

  // 视觉优化：墨色更柔和，动爻红色更正
  const lineColor = line.isChanging ? 'bg-[#C82E31]' : 'bg-stone-800'
  const isYang = displayType === 'yang'

  // 1. 变卦显示模式 (简化版)
  if (isChanged) {
    const textClass = line.isChanging
      ? 'flex flex-col justify-center h-full text-sm animate-in fade-in slide-in-from-left-2 text-stone-800 ml-4'
      : 'flex flex-col justify-center h-full text-sm opacity-60 grayscale blur-[0.5px] ml-4' // 未动之爻虚化
    
    return (
      <div className="flex flex-col h-14 border-b border-dashed border-stone-100/50 justify-center">
        <div className="flex items-center">
          {/* 爻条 */}
          <div className="w-16 h-4 flex items-center justify-between relative shrink-0">
            {isYang ? (
              <div className={`w-full h-[8px] rounded-[2px] shadow-sm ${lineColor}`} />
            ) : (
              <>
                <div className={`w-[42%] h-[8px] rounded-[2px] shadow-sm ${lineColor}`} />
                <div className={`w-[42%] h-[8px] rounded-[2px] shadow-sm ${lineColor}`} />
              </>
            )}
          </div>
          {/* 变卦文字 - 上下结构 */}
          <div className={textClass}>
            <span className="font-bold font-serif text-stone-700 leading-none mb-0.5">{changedDetail?.relationShort}</span>
            <span className="font-serif text-xs text-stone-500 leading-none">
              {changedDetail?.stem}{changedDetail?.branch}{changedDetail?.element}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 2. 本卦显示模式 (高精度设计)
  return (
    <div className="relative group hover:bg-stone-50/80 transition-colors -mx-3 px-3 rounded-lg border-b border-dashed border-stone-100">
      <div className="flex items-center h-14">
        
        {/* 第一列：六兽 */}
        <div className="w-8 flex flex-col items-center justify-center shrink-0 border-r border-stone-100 pr-2 mr-3 h-8">
           <span className="text-xs font-bold text-stone-500 font-serif mb-0.5">{detail?.animalShort}</span>
        </div>

        {/* 第二列：六亲与干支 + 伏神 (重点优化区域) */}
        <div className="w-28 flex flex-col justify-center shrink-0 mr-2">
          {/* 主信息：六亲 干支 */}
          <div className="flex items-baseline gap-2">
             <span className="font-bold text-stone-800 font-serif text-[15px]">{detail?.relationShort}</span>
             <span className="text-stone-600 font-serif text-sm">
                {detail?.stem}{detail?.branch}<span className="text-xs text-stone-400 ml-0.5">{detail?.element}</span>
             </span>
          </div>
          
          {/* 伏神/卦身：独立一行，红色显示 */}
          {(fuShen || guaShen) && (
            <div className="flex items-center gap-2 mt-0.5">
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
          )}
        </div>

        {/* 第三列：核心爻线 */}
        <div className="relative flex items-center justify-center w-24 shrink-0">
          <div className="w-20 h-4 flex items-center justify-between relative cursor-default">
            {isYang ? (
              <div className={`w-full h-[8px] rounded-[2px] shadow-sm ${lineColor} opacity-90`} />
            ) : (
              <>
                <div className={`w-[42%] h-[8px] rounded-[2px] shadow-sm ${lineColor} opacity-90`} />
                <div className={`w-[42%] h-[8px] rounded-[2px] shadow-sm ${lineColor} opacity-90`} />
              </>
            )}
          </div>
        </div>

        {/* 第四列：世应标记与动爻 */}
        <div className="flex items-center gap-2 ml-3 w-12 shrink-0">
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

      </div>
    </div>
  )
})
HexagramLine.displayName = 'HexagramLine'

// --- 子组件: 神煞列表 ---
const ShenShaList = ({ list }: { list: ShenShaItem[] }) => {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {list.map((ss, idx) => (
        <span key={idx} className="text-stone-500 font-serif flex items-center bg-white px-2 py-1 rounded border border-stone-100 shadow-sm">
           <span className="text-stone-400 mr-1.5">{ss.name}</span>
           <span className="font-medium text-stone-700">{ss.value}</span>
        </span>
      ))}
    </div>
  )
}

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

  // 1. 加载数据逻辑
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

  // 2. 核心数据计算
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
      hasMovingLines,
      date,
      stems,
      branches,
      solarTerm: solarTermTextFrom(date),
      shenShaList,
      kongWang,
      lineDetails,
      changedLineDetails,
      originalLineDisplayReversed: originalLineDisplay.slice().reverse(),
      changedLineDisplayReversed: changedLineDisplay.slice().reverse(),
      originalNature,
      changedNature,
      originalFullInfo,
      changedFullInfo,
      fuShenMap,
      guaShen,
      guaShenLineIndex
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
    hasMovingLines,
    date, stems, branches, solarTerm, shenShaList, kongWang, 
    lineDetails, changedLineDetails, originalLineDisplayReversed, changedLineDisplayReversed,
    originalNature, changedNature, originalFullInfo, changedFullInfo, fuShenMap, guaShen, guaShenLineIndex
  } = calculatedData

  return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="min-h-screen bg-[#f5f5f7] paper-texture flex justify-center p-4 lg:p-8 font-sans">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <Card className="border-none shadow-sm bg-white min-h-[800px] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#C82E31]/80"></div>
              <div className="p-8 lg:p-12 flex-1">
                
                {/* 1. 标题区 */}
                <div className="mb-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-[#C82E31] bg-[#C82E31]/10 border border-[#C82E31]/20 px-2 py-0.5 rounded tracking-wide">
                        所占事项
                      </span>
                      <span className="text-xs text-stone-400 font-mono tracking-wider">
                        {['手动摇卦', '自动摇卦', '手工指定'][payload.divinationMethod]} 
                      </span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-serif font-bold text-stone-800 leading-snug tracking-tight">
                      {payload.question || '诚心求占此事吉凶'}
                    </h1>
                  </div>
                </div>

                {/* 2. 信息区 (重构版) */}
                <div className="bg-stone-50/70 rounded-xl border border-stone-200/60 p-5 mb-12">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    
                    {/* 左侧：日期详细信息 */}
                    <div className="flex flex-col gap-3 min-w-0 w-full lg:w-auto">
                       <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                          <Calendar className="w-4 h-4 text-[#C82E31]" />
                          <span>{formatDateTime(payload.divinationTimeISO)}</span>
                       </div>
                       
                       <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                          <div className="flex items-center gap-1.5">
                             <Moon className="w-3.5 h-3.5 text-stone-400" />
                             <span className="font-serif tracking-wide">农历 {getLunarDateStringWithoutYear(date)}</span>
                          </div>
                          <div className="w-px h-3 bg-stone-300"></div>
                          <div className="flex items-center gap-1.5">
                             <Sun className="w-3.5 h-3.5 text-amber-500/70" />
                             <span className="font-serif">{solarTerm.split(' ~ ')[0]}</span>
                          </div>
                          <div className="w-px h-3 bg-stone-300"></div>
                          <div className="flex items-center gap-1">
                             <CloudFog className="w-3.5 h-3.5 text-stone-400" />
                             <span className="bg-stone-200/50 px-1.5 py-0.5 rounded text-stone-600">旬空: {kongWang}</span>
                          </div>
                       </div>

                       <button 
                          onClick={() => setShowShenSha(!showShenSha)}
                          className="flex items-center gap-1 text-xs text-stone-400 hover:text-[#C82E31] transition-colors cursor-pointer w-fit mt-1 group"
                        >
                          <span className="border-b border-dashed border-stone-300 group-hover:border-[#C82E31] pb-0.5">
                            {showShenSha ? '收起神煞' : '查看神煞互参'}
                          </span>
                          {showShenSha ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>

                    {/* 右侧：竖排四柱 */}
                    <div className="flex items-start gap-4 shrink-0 border-l border-stone-200 pl-6 lg:pl-8 py-1">
                      {['年', '月', '日', '时'].map((label, i) => {
                        const isDay = label === '日';
                        return (
                          <div key={i} className={`flex flex-col items-center gap-2 group ${isDay ? 'relative -top-1' : ''}`}>
                            <span className="text-[10px] text-stone-400 scale-90">{label}</span>
                            <div className={`
                               flex flex-col items-center py-2 px-2.5 rounded-lg border writing-vertical
                               ${isDay 
                                 ? 'bg-white border-[#C82E31]/30 shadow-[0_2px_8px_rgba(200,46,49,0.08)]' 
                                 : 'bg-transparent border-transparent group-hover:bg-stone-100/50'}
                            `}>
                              <span className={`font-serif text-lg leading-tight mb-1 ${isDay ? 'text-[#C82E31] font-bold' : 'text-stone-700'}`}>
                                {stems[i]?.char}
                              </span>
                              <span className={`font-serif text-lg leading-tight ${isDay ? 'text-[#C82E31] font-bold' : 'text-stone-700'}`}>
                                {branches[i]?.char}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 隐藏/展开的神煞面板 */}
                  {showShenSha && (
                    <div className="mt-4 pt-4 border-t border-stone-200 border-dashed animate-in fade-in slide-in-from-top-1 duration-200">
                      <ShenShaList list={shenShaList} />
                    </div>
                  )}
                </div>

                {/* 3. 卦象主体 */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-16 mb-16 relative">
                  
                  {/* 左侧：本卦 */}
                  <div className="flex-1 w-full">
                    {/* 卦名头 */}
                    <div className="flex items-center gap-3 mb-8 pl-1 border-l-4 border-stone-800 h-6">
                      <h2 className="text-2xl font-bold text-stone-800 font-serif tracking-wide leading-none">
                        {originalFullInfo.fullName || getFullHexagramName(payload.result.originalKey, payload.result.original.name)}
                      </h2>
                      <span className="text-xs text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full self-center">
                        {originalNature.nature}
                        {originalFullInfo.soulType && ` · ${originalFullInfo.soulType}`}
                      </span>
                    </div>

                    {/* 爻线列表 */}
                    <div className="flex flex-col gap-0">
                      {originalLineDisplayReversed.map((line, i) => {
                        const detailIndex = 5 - i // 0=初爻, 5=上爻
                        return (
                          <HexagramLine 
                            key={`org-${i}`} 
                            line={line} 
                            detail={lineDetails[detailIndex]} 
                            changedDetail={changedLineDetails[detailIndex]} 
                            fuShen={fuShenMap && detailIndex in fuShenMap ? (fuShenMap as Record<number, string>)[detailIndex] : undefined} 
                            guaShen={guaShenLineIndex === detailIndex ? guaShen : undefined}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* 中间：连接符 (仅有动爻时显示) */}
                  <div className={`hidden lg:flex flex-col items-center justify-center pt-28 px-0 transition-opacity duration-300 ${!hasMovingLines ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="bg-stone-50 rounded-full p-2 border border-stone-100 shadow-sm">
                      <ArrowRight className="w-5 h-5 text-stone-400" />
                    </div>
                  </div>

                  {/* 右侧：变卦区域 */}
                  <div className={`flex-1 w-full relative transition-all duration-500 ${!hasMovingLines ? 'select-none' : ''}`}>
                    
                    {/* 头部：无动爻时隐藏具体信息 */}
                    <div className={`flex items-center gap-3 mb-8 pl-1 border-l-4 border-stone-300 h-6 transition-opacity ${!hasMovingLines ? 'opacity-0' : 'opacity-100'}`}>
                      <h2 className="text-2xl font-bold text-stone-600 font-serif tracking-wide leading-none">
                        {hasMovingLines ? (changedFullInfo.fullName || getFullHexagramName(payload.result.changedKey, payload.result.changed.name)) : '变卦'}
                      </h2>
                      {hasMovingLines && (
                        <span className="text-xs text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full self-center">
                           {changedNature.nature}
                           {changedFullInfo.soulType && ` · ${changedFullInfo.soulType}`}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-0 border-l lg:border-none border-dashed border-stone-200 pl-6 lg:pl-0">
                       {hasMovingLines ? (
                         // 有动爻：正常渲染
                         changedLineDisplayReversed.map((line, i) => {
                           const detailIndex = 5 - i
                           return (
                             <HexagramLine 
                               key={`chg-${i}`} 
                               line={line} 
                               detail={lineDetails[detailIndex]} 
                               changedDetail={changedLineDetails[detailIndex]} 
                               isChanged={true} 
                             />
                           )
                         })
                       ) : (
                         // 无动爻：渲染极简占位符
                         Array(6).fill(0).map((_, i) => (
                           <div key={`empty-${i}`} className="flex flex-col h-14 justify-center border-b border-dashed border-stone-100/50">
                             <div className="flex items-center gap-3 opacity-10">
                               <div className="w-16 h-[8px] bg-stone-400 rounded-[2px]"></div>
                             </div>
                           </div>
                         ))
                       )}
                    </div>

                    {/* 六爻安静印章 (无动爻时显示) */}
                    {!hasMovingLines && (
                       <div className="absolute top-1/2 left-0 lg:left-10 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
                          <div className="w-32 h-32 border-[3px] border-stone-200 rounded-full flex items-center justify-center opacity-40 rotate-[-15deg]">
                              <div className="w-28 h-28 border border-stone-200 rounded-full flex flex-col items-center justify-center gap-1">
                                <span className="text-stone-300 font-serif font-bold text-2xl tracking-widest">六爻</span>
                                <span className="text-stone-300 font-serif font-bold text-2xl tracking-widest">安静</span>
                              </div>
                          </div>
                       </div>
                    )}
                  </div>
                </div>

                {/* 4. 卦辞区域 (卡片化风格) */}
                <div className="bg-[#faf9f6] rounded-xl border border-[#e5e0d8] p-6 lg:p-8 relative overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
                   {/* 背景装饰字 */}
                   <div className="absolute -top-4 -right-4 opacity-[0.04] pointer-events-none select-none">
                      <span className="font-serif text-9xl text-stone-900">易</span>
                   </div>
                   
                   {/* 装饰红线 */}
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#C82E31] opacity-80"></div>

                   {/* 根据是否有动爻切换布局 */}
                   <div className={`relative z-10 ${hasMovingLines ? 'grid lg:grid-cols-2 gap-10' : 'max-w-3xl mx-auto'}`}>
                      {/* 本卦卦辞 */}
                      <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-[#C82E31]"></span>
                           <h3 className="font-bold text-stone-800 font-serif text-lg">
                             本卦 · {originalFullInfo.fullName}
                           </h3>
                        </div>
                        <p className={`text-stone-600 text-sm leading-8 font-serif text-justify ${!hasMovingLines ? 'text-base' : ''}`}>
                          {payload.result.original.interpretation}
                        </p>
                      </div>
                      
                      {/* 变卦卦辞 (有动爻时显示) */}
                      {hasMovingLines && (
                        <div>
                          <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                             <h3 className="font-bold text-stone-700 font-serif text-lg">变卦 · {changedFullInfo.fullName}</h3>
                          </div>
                          <p className="text-stone-500 text-sm leading-8 font-serif text-justify">
                            {payload.result.changed.interpretation}
                          </p>
                        </div>
                      )}
                   </div>
                </div>

              </div>
              <div className="h-2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </Card>
          </div>

          {/* 右侧工具栏 */}
          <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
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
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 disabled:opacity-50 h-9" onClick={() => saveRecordToCloud(true)} disabled={saving || isSaved}>
                    <Save className={`w-4 h-4 ${isSaved ? 'text-green-600' : ''}`} /> {saving ? '保存中...' : isSaved ? '已保存到云端' : '保存到云端'}
                 </Button>
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9" onClick={handlePublish} disabled={saving}>
                    <Share2 className="w-4 h-4" /> {saving ? '保存中...' : '发布到社区'}
                 </Button>
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9"><Download className="w-4 h-4" /> 分享结果图</Button>
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9"><BookOpen className="w-4 h-4" /> 导出排盘数据</Button>
               </div>
            </Card>

            <div className="mt-8 text-center">
               <Button 
                 variant="outline" 
                 className="w-full border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" 
                 onClick={() => {
                   if (from === 'community') {
                     // 从社区页面跳转过来的，返回上一页（社区帖子详情页）
                     router.back()
                   } else {
                     // 从排盘工具页跳转过来的，返回排盘工具页
                     router.push('/6yao')
                   }
                 }}
               >
                 {from === 'community' ? (
                   <>
                     <ArrowRight className="w-3.5 h-3.5 rotate-180" /> 返回帖子
                   </>
                 ) : (
                   <>
                     <RotateCcw className="w-3.5 h-3.5" /> 重新排盘
                   </>
                 )}
               </Button>
               <p className="text-[10px] text-stone-300 mt-4 font-serif tracking-widest">易知 · 诚心问道 · 必有回响</p>
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