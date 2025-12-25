'use client'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown, ChevronUp,
  CloudFog, Download,
  Edit2,
  Moon,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw, Save, Share2, Sparkles,
  Sun,
  Trash2,
  Wand2,
  X
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { ToastProviderWrapper } from '@/lib/components/ToastProviderWrapper'
import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Textarea } from '@/lib/components/ui/textarea'
import {
  LINE_LABELS, RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId
} from '@/lib/constants/divination'
import { HEXAGRAM_FULL_NAMES } from '@/lib/constants/liuyaoConstants'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import {
  addDivinationNote,
  deleteDivinationNote,
  getDivinationNotes,
  getDivinationRecordById,
  saveDivinationRecord,
  updateDivinationNote,
  updateDivinationQuestion,
  type DivinationNote
} from '@/lib/services/profile'
import { buildLineDisplay } from '@/lib/utils/divinationLines'
import { buildChangedLines as buildChangedLinesUtil } from '@/lib/utils/divinationLineUtils'
import { calculateChangedLineDetails, calculateLineDetails, getExtendedShenSha, getFuShenAndGuaShen, getHexagramFullInfo, getHexagramNature, type LineDetail, type ShenShaItem } from '@/lib/utils/liuyaoDetails'
import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateStringWithoutYear } from '@/lib/utils/lunar'
import { solarTermTextFrom } from '@/lib/utils/solarTerms'
import AIResultDialog from '../components/AIResultDialog'

const GLOBAL_STYLES = `
  .font-serif-sc { font-family: "Noto Serif SC", "Songti SC", serif; }
  .writing-vertical { writing-mode: vertical-rl; }
`

const AI_NOTE_PREFIX = '【AI详批】'
const AI_RESULT_STORAGE_PREFIX = 'aiResult:'
const stripAiNotePrefix = (content: string) => content.replace(/^【AI详批】\n?/, '')

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

          {/* 移动端：六兽简写 */}
          <div className={`lg:hidden flex flex-col justify-center ml-3 ${opacityClass}`}>
             <span className="text-[10px] font-serif text-stone-500">
               {detail?.animalShort}
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
interface ActionButtonProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}

const ActionButton = ({ icon: Icon, label, onClick, disabled = false, active = false }: ActionButtonProps) => (
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

const HexagramBackground = () => (
  <div className="absolute inset-0 z-0 pointer-events-none">
    <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="shell_pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M50 0 L100 25 V75 L50 100 L0 75 V25 Z" stroke="#2C3E50" strokeWidth="1" fill="none" opacity="0.05"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#shell_pattern)"/>
      <path d="M300 50 L340 70 V110 L300 130 L260 110 V70 Z" stroke="#C82E31" strokeWidth="2" strokeOpacity="0.1" fill="none"/>
    </svg>
  </div>
)

// --- 主内容组件 ---
function ResultPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const resultId = params.id as string
  const from = searchParams.get('from')
  const normalizedResultId = resultId.startsWith('db-') ? resultId.substring(3) : resultId
  
  const [payload, setPayload] = useState<StoredDivinationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [showShenSha, setShowShenSha] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false)
  const [forceAiAnalyze, setForceAiAnalyze] = useState(false)
  
  // Note state
  const [notes, setNotes] = useState<DivinationNote[]>([])
  const [aiResult, setAiResult] = useState('')
  const [aiResultAt, setAiResultAt] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  
  // Question editing state
  const [question, setQuestion] = useState('')
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [questionLoading, setQuestionLoading] = useState(false)

  const displayNotes = useMemo(() => notes.filter((n) => !n.content.startsWith(AI_NOTE_PREFIX)), [notes])
  const recordIdForAi = savedRecordId || (isUUID(normalizedResultId) ? normalizedResultId : null)
  const aiStorageKey = recordIdForAi || normalizedResultId

  const handleConfirmReanalyze = () => {
    setShowReanalyzeConfirm(false)
    setForceAiAnalyze(true)
    setShowAI(true)
  }

  // Sync question state with payload
  useEffect(() => {
    if (payload) {
      setQuestion(payload.question || '诚心求占此事吉凶')
    }
  }, [payload])

  // 数据加载
  useEffect(() => {
    if (typeof window === 'undefined' || !resultId) return
    const loadResult = async () => {
      try {
        // Handle db- prefix which might be used in URLs
        let actualId = resultId
        if (actualId.startsWith('db-')) {
          actualId = actualId.substring(3)
        }

        if (isUUID(actualId)) {
          const record = await getDivinationRecordById(actualId, false)
          if (record) {
            // Check authorship
            const currentUser = await getCurrentUser()
            if (currentUser && record.user_id === currentUser.id) {
              setIsAuthor(true)
            } else {
              setIsAuthor(false)
            }

            const originalJson = typeof record.original_json === 'string' ? JSON.parse(record.original_json) : record.original_json || {}
            const changedJson = typeof record.changed_json === 'string' ? JSON.parse(record.changed_json) : record.changed_json || {}
            
            const questionVal = record.question || '诚心求占此事吉凶'
            
            // Explicitly set question state to match payload immediately
            setQuestion(questionVal)
            
            setPayload({
              question: questionVal,
              divinationTimeISO: record.divination_time,
              divinationMethod: record.method,
              lines: record.lines,
              changingFlags: record.changing_flags,
              note: record.note || undefined,
              result: {
                originalKey: record.original_key,
                changedKey: record.changed_key,
                original: originalJson,
                changed: changedJson,
                changingLines: record.changing_flags.map((f, i) => f ? i + 1 : 0).filter(Boolean),
              },
            })
            setIsSaved(true)
            setSavedRecordId(actualId)
            setHasUnsavedChanges(false)
            
            // Fetch notes
            getDivinationNotes(actualId).then(fetchedNotes => {
              setNotes(fetchedNotes)
              const aiNote = fetchedNotes.find((n) => n.content.startsWith(AI_NOTE_PREFIX))
              if (aiNote) {
                setAiResult(stripAiNotePrefix(aiNote.content))
                setAiResultAt(aiNote.created_at)
              } else if (typeof window !== 'undefined') {
                const cached = window.localStorage.getItem(`${AI_RESULT_STORAGE_PREFIX}${actualId}`)
                if (cached) {
                  setAiResult(cached)
                  setAiResultAt(null)
                } else {
                  setAiResult('')
                  setAiResultAt(null)
                }
              }
            }).catch(err => {
              console.error("Failed to load notes:", err)
            })
          } else {
            router.push('/6yao')
          }
        } else {
          // ... existing local storage logic ...
          const stored = localStorage.getItem(RESULTS_LIST_STORAGE_KEY)
          if (stored) {
            const list = JSON.parse(stored) as StoredResultWithId[]
            const found = list.find((r: StoredResultWithId) => r.id === resultId)
            if (found) {
              if (!found.question) found.question = '诚心求占此事吉凶'
              setQuestion(found.question)
              setPayload(found)
              const cached = localStorage.getItem(`${AI_RESULT_STORAGE_PREFIX}${normalizedResultId}`)
              if (cached) {
                setAiResult(cached)
                setAiResultAt(null)
              } else {
                setAiResult('')
                setAiResultAt(null)
              }
            }
            else {
               const legacy = localStorage.getItem('latestDivinationResult')
               if(legacy) {
                 const legacyData = JSON.parse(legacy)
                 if (!legacyData.question) legacyData.question = '诚心求占此事吉凶'
                 setQuestion(legacyData.question)
                 setPayload(legacyData)
               }
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
  }, [router, resultId, normalizedResultId])

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
    // If already saved and has unsaved changes, update the question
    if (isSaved && savedRecordId && hasUnsavedChanges) {
      setQuestionLoading(true)
      try {
        const { success, message } = await updateDivinationQuestion(savedRecordId, question)
        if (success) {
          if (showToast) toast({ title: '更新成功', description: '排盘信息已更新' })
          setHasUnsavedChanges(false)
          // Update local payload question
          if (payload) {
            setPayload({ ...payload, question: question || '诚心求占此事吉凶' })
          }
          return savedRecordId
        } else {
          if (showToast) toast({ title: '更新失败', description: message, variant: 'destructive' })
          return null
        }
      } catch {
        if (showToast) toast({ title: '更新失败', variant: 'destructive' })
        return null
      } finally {
        setQuestionLoading(false)
      }
    }

    // If already saved and no unsaved changes, don't do anything
    if (isSaved && !hasUnsavedChanges) {
      if (showToast) toast({ title: '排盘记录已保存', description: '该记录已保存到数据库' })
      return savedRecordId || (isUUID(resultId) ? resultId : null)
    }

    if (!payload || saving || !calculatedData) return savedRecordId || (isUUID(resultId) ? resultId : null)
    
    setSaving(true)
    try {
      const res = await saveDivinationRecord({
        ...payload,
        question: question, // Use current question state
        result: {
           ...payload.result,
           original: { ...payload.result.original, kongWang: calculatedData.kongWang } as unknown as Record<string, unknown>,
           changed: payload.result.changed as unknown as Record<string, unknown>
        }
      })
      if (res.success) {
        setIsSaved(true)
        setSavedRecordId(res.recordId || null)
        setHasUnsavedChanges(false)
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
  }, [payload, saving, isSaved, savedRecordId, resultId, toast, calculatedData, question, hasUnsavedChanges])

  const handlePublish = async () => {
    let recordIdToUse = savedRecordId || (isUUID(resultId) ? resultId : null)
    if (!isSaved) recordIdToUse = await saveRecordToCloud(false)
    if (recordIdToUse) router.push(`/community/publish?tab=divination&recordId=${recordIdToUse}`)
    else toast({ title: '无法发布', description: '无法获取排盘记录ID', variant: 'destructive' })
  }

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    
    const recordIdToUse = savedRecordId || (isUUID(resultId) ? resultId : null)

    if (!recordIdToUse) {
       toast({ title: '请先保存排盘记录', description: '保存后即可添加笔记', variant: 'destructive' })
       return
    }

    setNoteLoading(true)
    try {
      const { success, note } = await addDivinationNote(recordIdToUse, newNoteContent)
      if (success && note) {
        setNotes(prev => [note, ...prev])
        setNewNoteContent('')
        toast({ title: '笔记添加成功' })
      } else {
        toast({ title: '添加失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '添加失败', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return
    
    setNoteLoading(true)
    try {
      const { success, note } = await updateDivinationNote(noteId, editNoteContent)
      if (success && note) {
        setNotes(prev => prev.map(n => n.id === noteId ? note : n))
        setEditingNoteId(null)
        setEditNoteContent('')
        toast({ title: '笔记更新成功' })
      } else {
        toast({ title: '更新失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '更新失败', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return

    setNoteLoading(true)
    try {
      const { success } = await deleteDivinationNote(noteId)
      if (success) {
        setNotes(prev => prev.filter(n => n.id !== noteId))
        toast({ title: '笔记删除成功' })
      } else {
        toast({ title: '删除失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-400">加载中...</div>
  if (!payload || !calculatedData) return null

  console.log('[DEBUG] Render state:', { isSaved, hasUnsavedChanges, savedRecordId, notesCount: notes.length })

  const { 
    hasMovingLines, date, stems, branches, solarTerm, shenShaList, kongWang, 
    lineDetails, changedLineDetails, originalLineDisplayReversed, changedLineDisplayReversed,
    originalNature, changedNature, originalFullInfo, changedFullInfo, fuShenMap, guaShen, guaShenLineIndex
  } = calculatedData

  return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="min-h-screen bg-[#fdfbf7] relative flex justify-center p-0 lg:p-8 font-sans">
        <HexagramBackground />
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 relative z-10">
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
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-stone-800 leading-snug tracking-tight break-words flex-1">
                        {isEditingQuestion ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={question}
                              onChange={(e) => {
                                setQuestion(e.target.value)
                                if (e.target.value !== (payload?.question || '诚心求占此事吉凶')) {
                                  setHasUnsavedChanges(true)
                                }
                              }}
                              className="flex-1 border-b border-stone-300 focus:border-[#C82E31] outline-none bg-transparent"
                              autoFocus
                              onBlur={() => {
                                if (question === (payload?.question || '诚心求占此事吉凶')) {
                                  setIsEditingQuestion(false)
                                }
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && question !== (payload?.question || '诚心求占此事吉凶')) {
                                  setQuestionLoading(true)
                                  try {
                                    const { success, message } = await updateDivinationQuestion(savedRecordId!, question)
                                    if (success) {
                                      toast({ title: '更新成功', description: '所占事项已更新' })
                                      setIsEditingQuestion(false)
                                      setHasUnsavedChanges(false)
                                      if (payload) {
                                        setPayload({ ...payload, question: question || '诚心求占此事吉凶' })
                                      }
                                    } else {
                                      toast({ title: '更新失败', description: message, variant: 'destructive' })
                                    }
                                  } catch {
                                    toast({ title: '更新失败', variant: 'destructive' })
                                  } finally {
                                    setQuestionLoading(false)
                                  }
                                } else if (e.key === 'Escape') {
                                  setQuestion(payload?.question || '诚心求占此事吉凶')
                                  setIsEditingQuestion(false)
                                  setHasUnsavedChanges(false)
                                }
                              }}
                            />
                            {question !== (payload?.question || '诚心求占此事吉凶') && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setQuestion(payload?.question || '诚心求占此事吉凶')
                                    setIsEditingQuestion(false)
                                    setHasUnsavedChanges(false)
                                  }}
                                  className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
                                  disabled={questionLoading}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    setQuestionLoading(true)
                                    try {
                                      const { success, message } = await updateDivinationQuestion(savedRecordId!, question)
                                      if (success) {
                                        toast({ title: '更新成功', description: '所占事项已更新' })
                                        setIsEditingQuestion(false)
                                        setHasUnsavedChanges(false)
                                        if (payload) {
                                          setPayload({ ...payload, question: question || '诚心求占此事吉凶' })
                                        }
                                      } else {
                                        toast({ title: '更新失败', description: message, variant: 'destructive' })
                                      }
                                    } catch {
                                      toast({ title: '更新失败', variant: 'destructive' })
                                    } finally {
                                      setQuestionLoading(false)
                                    }
                                  }}
                                  className="p-1 text-green-600 hover:text-green-700 transition-colors"
                                  disabled={questionLoading}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span 
                            onClick={() => isSaved && isAuthor && setIsEditingQuestion(true)} 
                            className={isSaved && isAuthor ? "cursor-pointer hover:text-[#C82E31]/80 transition-colors border-b border-transparent hover:border-stone-200" : ""}
                            title={isSaved && isAuthor ? "点击修改所占事项" : ""}
                          >
                            {question}
                          </span>
                        )}
                      </h1>
                      {isSaved && isAuthor && !isEditingQuestion && (
                        <button 
                          onClick={() => setIsEditingQuestion(true)}
                          className="p-1 text-stone-400 hover:text-[#C82E31] transition-colors"
                        >
                          <PenLine className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
                    <div className="flex flex-col gap-0 pl-1 sm:pl-0 border-l border-dashed border-stone-200 sm:border-none">
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

                {isAuthor && aiResult && (
                <div className="mb-8 bg-white border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-[#C82E31]" />
                      <h4 className="font-serif font-bold text-stone-800 text-base lg:text-lg tracking-wide">
                        AI 分析结果
                      </h4>
                      {aiResultAt && <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{formatDateTime(aiResultAt)}</span>}
                   </div>
                   <div className="prose prose-stone max-w-none font-serif text-stone-800 prose-headings:text-[#C82E31] prose-strong:text-[#C82E31]">
                     <ReactMarkdown>{aiResult}</ReactMarkdown>
                   </div>
                   <div className="flex justify-end pt-4">
                     <Button variant="outline" className="gap-2 text-[#C82E31] border-[#C82E31]/30 hover:bg-red-50" onClick={() => setShowReanalyzeConfirm(true)}>
                       <RefreshCw className="w-4 h-4" /> 重新分析
                     </Button>
                   </div>
                </div>
                )}

                {/* 5. 私密笔记 */}
                {isAuthor && (
                <div className="mb-8 bg-white border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-4">
                      <BookOpen className="w-5 h-5 text-[#C82E31]" />
                      <h4 className="font-serif font-bold text-stone-800 text-base lg:text-lg tracking-wide">
                        私密笔记
                      </h4>
                      <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">仅自己可见</span>
                   </div>
                   
                   <div className="space-y-6">
                     {/* 笔记列表 */}
                     <div className="space-y-4">
                       {displayNotes.length === 0 ? (
                         <div className="text-center py-8 text-stone-400 text-sm italic bg-stone-50 rounded-lg border border-dashed border-stone-200">
                           暂无笔记，记录下您的断语或反馈吧...
                         </div>
                       ) : (
                         displayNotes.map(note => (
                           <div key={note.id} className="group relative bg-stone-50/50 hover:bg-stone-50 border border-stone-100 rounded-lg p-4 transition-all">
                             {editingNoteId === note.id ? (
                               <div className="space-y-3">
                                 <Textarea
                                   value={editNoteContent}
                                   onChange={(e) => setEditNoteContent(e.target.value)}
                                   className="min-h-[80px] bg-white"
                                 />
                                 <div className="flex justify-end gap-2">
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => {
                                       setEditingNoteId(null)
                                       setEditNoteContent('')
                                     }}
                                     className="h-8 w-8 p-0"
                                   >
                                     <X className="w-4 h-4 text-stone-400" />
                                   </Button>
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => handleUpdateNote(note.id)}
                                     disabled={noteLoading}
                                     className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                   >
                                     <Check className="w-4 h-4" />
                                   </Button>
                                 </div>
                               </div>
                             ) : (
                               <>
                                 <div className="flex justify-between items-start mb-2">
                                   <span className="text-xs text-stone-400 font-mono">
                                     {formatDateTime(note.created_at)}
                                   </span>
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-6 w-6 p-0 hover:bg-stone-200 text-stone-400 hover:text-stone-600"
                                       onClick={() => {
                                         setEditingNoteId(note.id)
                                         setEditNoteContent(note.content)
                                       }}
                                     >
                                       <Edit2 className="w-3.5 h-3.5" />
                                     </Button>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-6 w-6 p-0 hover:bg-red-100 text-stone-400 hover:text-red-600"
                                       onClick={() => handleDeleteNote(note.id)}
                                     >
                                       <Trash2 className="w-3.5 h-3.5" />
                                     </Button>
                                   </div>
                                 </div>
                                 <p className="text-sm text-stone-700 font-serif whitespace-pre-wrap leading-relaxed">
                                   {note.content}
                                 </p>
                               </>
                             )}
                           </div>
                         ))
                       )}
                     </div>

                     {/* 添加笔记 */}
                     <div className="space-y-2 pt-2 border-t border-stone-100">
                       <Textarea 
                           placeholder="写下新的笔记..."
                           className="min-h-[80px] bg-white border-stone-200 resize-none focus:border-[#C82E31]/30 transition-colors font-serif text-stone-700"
                           value={newNoteContent}
                           onChange={(e) => setNewNoteContent(e.target.value)}
                       />
                       <div className="flex justify-end">
                           <Button 
                           onClick={handleAddNote} 
                           disabled={noteLoading || !newNoteContent.trim()}
                           variant="outline"
                           className="text-stone-600 hover:text-[#C82E31] hover:bg-red-50 border-stone-200 gap-1"
                           size="sm"
                           >
                           <Plus className="w-4 h-4" />
                           {noteLoading ? '添加中...' : '添加笔记'}
                           </Button>
                       </div>
                     </div>
                   </div>
                </div>
                )}

                {/* 5. 底部工具栏 (移动端专属 Grid) */}
                <div className="lg:hidden space-y-4 pb-8">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#C82E31] to-[#D94F4F] shadow-lg shadow-red-900/10 p-4">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Sparkles className="w-24 h-24 text-white -rotate-12 translate-x-4 -translate-y-4" /></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="text-white">
                        <h3 className="font-serif font-bold text-base flex items-center gap-2"><Wand2 className="w-4 h-4" /> AI 智能详批</h3>
                        <p className="text-[10px] text-red-50/90 mt-0.5">深度解析吉凶应期，准确率提升30%</p>
                      </div>
                      <Button onClick={() => setShowAI(true)} className="bg-white text-[#C82E31] hover:bg-red-50 border-none font-bold text-xs h-8 px-4 rounded-full shadow-sm">立即分析</Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-400 mb-2 px-1 uppercase tracking-wider">工具箱</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <ActionButton 
                        icon={Save} 
                        label={isSaved && !hasUnsavedChanges ? "已保存" : hasUnsavedChanges ? "更新" : "保存"} 
                        active={isSaved && !hasUnsavedChanges} 
                        onClick={() => saveRecordToCloud(true)} 
                        disabled={(isSaved && !hasUnsavedChanges) || saving} 
                      />
                      {isAuthor && <ActionButton icon={Share2} label="发布" onClick={handlePublish} disabled={saving} />}
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
             <Card className="border-none shadow-md overflow-hidden relative group cursor-pointer bg-linear-to-br from-[#C82E31] to-[#A61B1F]">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-16 h-16 text-white" /></div>
               <div className="relative p-6 text-white">
                 <div className="flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5" /><h3 className="font-bold font-serif text-lg">AI 智能详批</h3></div>
                 <p className="text-red-100 text-xs mb-4 leading-relaxed opacity-90">基于《增删卜易》古法，结合大模型深度推理，为您解析吉凶应期。</p>
                 <Button onClick={() => setShowAI(true)} className="w-full bg-white text-[#C82E31] hover:bg-red-50 border-none font-bold shadow-sm h-9 text-xs">开始分析</Button>
               </div>
            </Card>
            <Card className="bg-white border-none shadow-sm p-3">
               <div className="flex flex-col gap-1">
                 <Button 
                   variant="ghost" 
                   className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm" 
                   onClick={() => saveRecordToCloud(true)} 
                   disabled={(isSaved && !hasUnsavedChanges) || saving || questionLoading}
                 >
                    <Save className={`w-4 h-4 ${isSaved && !hasUnsavedChanges ? 'text-green-600' : ''}`} /> 
                    {saving || questionLoading ? '保存中...' : isSaved && !hasUnsavedChanges ? '已保存到云端' : hasUnsavedChanges ? '更新到云端' : '保存到云端'}
                 </Button>
                 {isAuthor && (
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm" onClick={handlePublish} disabled={saving}>
                    <Share2 className="w-4 h-4" /> {saving ? '保存中...' : '发布到社区'}
                 </Button>
                 )}
                 <Button variant="ghost" className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm"><Download className="w-4 h-4" /> 分享结果图</Button>
               </div>
            </Card>
            <div className="mt-8 text-center px-4 lg:px-0">
               <div className="flex flex-col gap-2">
                 {(from === 'community' || from === 'profile') && (
                   <Button variant="outline" className="w-full border-stone-200 bg-[#fdfbf7] text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.back()}>
                     <ArrowLeft className="w-3.5 h-3.5" /> 返回上一页
                   </Button>
                 )}
                 <Button variant="outline" className="w-full border-stone-200 bg-[#fdfbf7] text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.push('/6yao')}>
                   <RotateCcw className="w-3.5 h-3.5" /> 重新排盘
                 </Button>
               </div>
            </div>
          </div>
        </div>
          <Dialog open={showReanalyzeConfirm} onOpenChange={setShowReanalyzeConfirm}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>确认重新分析</DialogTitle>
                <DialogDescription>
                  本次操作将扣除 50 易币，重新分析的结果会覆盖之前的 AI 分析结果。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReanalyzeConfirm(false)}>取消</Button>
                <Button onClick={handleConfirmReanalyze} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white">
                  继续分析
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AIResultDialog 
            guaData={calculatedData} 
            open={showAI} 
            setOpen={(open) => {
              setShowAI(open)
              if (!open) setForceAiAnalyze(false)
            }} 
            question={question}
            recordId={aiStorageKey}
            initialResult={aiResult}
            forceAnalyze={forceAiAnalyze}
            onForceAnalyzeConsumed={() => setForceAiAnalyze(false)}
            onResultSaved={(result) => {
              setAiResult(result)
              setAiResultAt(new Date().toISOString())
              if (recordIdForAi) {
                getDivinationNotes(recordIdForAi).then((fetched) => {
                  setNotes(fetched)
                  const aiNote = fetched.find((n) => n.content.startsWith(AI_NOTE_PREFIX))
                  if (aiNote) setAiResultAt(aiNote.created_at)
                }).catch(() => {})
              }
            }}
          />
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
