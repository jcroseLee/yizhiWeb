'use client'

import {
    ArrowLeft,
    Check,
    PenLine,
    RotateCcw,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    X,
    Zap
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { trackEvent } from '@/lib/analytics'
import { ToastProviderWrapper } from '@/lib/components/ToastProviderWrapper'
import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/lib/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser, getSession } from '@/lib/services/auth'
import { getUserGrowth } from '@/lib/services/growth'
import {
    addDivinationNote,
    deleteDivinationNote,
    getBaZiRecordById,
    getDivinationNotes,
    saveBaZiRecord,
    updateBaZiName,
    updateDivinationNote,
    type DivinationNote
} from '@/lib/services/profile'
import {
    getMingGong,
    getMingGua,
    getShenGong,
    getTaiXi,
    getTaiYuan,
    type BaZiResult
} from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'
import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateStringWithoutYear } from '@/lib/utils/lunar'
import { getSolarTermsForYear } from '@/lib/utils/solarTerms'
import { AiAnalysisCard } from '../../components/AiAnalysisCard'
import { BaZiBasicInfo } from '../../components/BaZiBasicInfo'
import { BaZiChart } from '../../components/BaZiChart'
import { BaZiDetailedTab } from '../../components/BaZiDetailedTab'
import { BaZiRelationships } from '../../components/BaZiRelationships'
import { MobileResultActionsBar } from '../../components/MobileResultActionsBar'
import { PrivateNotesSection, type PrivateNotesSectionRef } from '../../components/PrivateNotesSection'
import { ResultActionsCard } from '../../components/ResultActionsCard'
import { ShareResultDialog } from '../../components/ShareResultDialog'

// 存储常量
const BAZI_RESULT_STORAGE_KEY = 'latestBaZiResult'
const BAZI_RESULTS_LIST_STORAGE_KEY = 'baZiResultsList'
const AI_RESULT_STORAGE_PREFIX = 'baziAiResult:'
const LOCAL_NOTES_STORAGE_PREFIX = 'baziLocalNotes:'
const AI_NOTE_PREFIX = '【AI详批】'

const stripAiNotePrefix = (content: string) => content.replace(/^【AI详批】\n?/, '')

// 样式
const GLOBAL_STYLES = `
  .font-ganzhi {
    font-family: "Noto Serif SC", "Songti SC", serif;
  }
  
  .text-wood { color: #3A7B5E; }
  .text-fire { color: #C82E31; }
  .text-earth { color: #8D6E63; }
  .text-metal { color: #D4AF37; }
  .text-water { color: #4B7BB6; }
  
  .bazi-grid {
    display: grid;
    grid-template-columns: 5rem repeat(4, 1fr);
    width: 100%;
  }
  .bazi-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.75rem 0.25rem;
  }
  .bazi-header {
    font-size: 0.75rem;
    color: #a8a29e;
    font-weight: normal;
  }
  
  .row-zebra:nth-child(even) {
    background-color: rgba(28, 25, 23, 0.02);
  }
  
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(0.75rem);
    border: 0.0625rem solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 0.5rem 2rem 0 rgba(31, 38, 135, 0.03);
  }
  
  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.2em;
  }
`

// 类型定义
export interface StoredBaZiResultWithId extends StoredBaZiPayload {
  id: string
  createdAt: string
}

export interface StoredBaZiPayload {
  name?: string
  gender: 'male' | 'female'
  dateISO: string // 原始时间（用于显示"阳历"）
  trueSolarDateISO?: string // 真太阳时（校正后的时间，用于显示"真太阳时"）
  hour?: string
  minute?: string
  city?: string
  solarTimeCorrection?: boolean
  earlyZiHour?: boolean
  result: BaZiResult
}

// 辅助函数
const isUUID = (str: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatDateTimeFull = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 计算星座
const getZodiacSign = (date: Date): { name: string; english: string } => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const signs = [
    { name: '摩羯座', english: 'Capricorn', start: [1, 20], end: [2, 18] },
    { name: '水瓶座', english: 'Aquarius', start: [1, 20], end: [2, 18] },
    { name: '双鱼座', english: 'Pisces', start: [2, 19], end: [3, 20] },
    { name: '白羊座', english: 'Aries', start: [3, 21], end: [4, 19] },
    { name: '金牛座', english: 'Taurus', start: [4, 20], end: [5, 20] },
    { name: '双子座', english: 'Gemini', start: [5, 21], end: [6, 21] },
    { name: '巨蟹座', english: 'Cancer', start: [6, 22], end: [7, 22] },
    { name: '狮子座', english: 'Leo', start: [7, 23], end: [8, 22] },
    { name: '处女座', english: 'Virgo', start: [8, 23], end: [9, 22] },
    { name: '天秤座', english: 'Libra', start: [9, 23], end: [10, 23] },
    { name: '天蝎座', english: 'Scorpio', start: [10, 24], end: [11, 22] },
    { name: '射手座', english: 'Sagittarius', start: [11, 23], end: [12, 21] },
  ]
  for (const sign of signs) {
    if ((month === sign.start[0] && day >= sign.start[1]) || (month === sign.end[0] && day <= sign.end[1])) {
      return { name: sign.name, english: sign.english }
    }
  }
  return { name: '摩羯座', english: 'Capricorn' }
}

// 计算星宿（简化版，基于日期）
const getLunarMansion = (date: Date): string => {
  // 简化计算，实际需要更复杂的算法
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000)
  const mansions = [
    '角宿', '亢宿', '氐宿', '房宿', '心宿', '尾宿', '箕宿',
    '斗宿', '牛宿', '女宿', '虚宿', '危宿', '室宿', '壁宿',
    '奎宿', '娄宿', '胃宿', '昴宿', '毕宿', '觜宿', '参宿',
    '井宿', '鬼宿', '柳宿', '星宿', '张宿', '翼宿', '轸宿'
  ]
  const index = Math.floor((dayOfYear % 365) / 13.5) % mansions.length
  const directions = ['东方苍龙', '北方玄武', '西方白虎', '南方朱雀']
  const direction = directions[Math.floor(index / 7) % 4]
  return `${mansions[index]}${direction}`
}


// 计算人元司令分野（简化版，基于月支）
const getRenYuanSiLing = (monthZhi: string): string => {
  const siLingMap: Record<string, string> = {
    '子': '癸水用事', '丑': '己土用事', '寅': '甲木用事', '卯': '乙木用事',
    '辰': '戊土用事', '巳': '丙火用事', '午': '丁火用事', '未': '己土用事',
    '申': '庚金用事', '酉': '辛金用事', '戌': '戊土用事', '亥': '壬水用事',
  }
  return siLingMap[monthZhi] || '--'
}

// 计算节气前后天数
const getSolarTermInfo = (date: Date) => {
  const year = date.getFullYear()
  const terms = getSolarTermsForYear(year)
  
  // 找到前一个和后一个节气
  let prevTerm = terms[0]
  let nextTerm = terms[1]
  
  for (let i = 0; i < terms.length; i++) {
    if (date >= terms[i].date) {
      prevTerm = terms[i]
      nextTerm = i + 1 < terms.length ? terms[i + 1] : getSolarTermsForYear(year + 1)[0]
    } else {
      nextTerm = terms[i]
      break
    }
  }
  
  if (date < terms[0].date) {
    const lastYearTerms = getSolarTermsForYear(year - 1)
    prevTerm = lastYearTerms[lastYearTerms.length - 1]
  }
  
  const diffMs = date.getTime() - prevTerm.date.getTime()
  const daysAfter = Math.floor(diffMs / 86400000)
  const hoursAfter = Math.floor((diffMs % 86400000) / 3600000)
  
  const nextDiffMs = nextTerm.date.getTime() - date.getTime()
  const daysBefore = Math.floor(nextDiffMs / 86400000)
  const hoursBefore = Math.floor((nextDiffMs % 86400000) / 3600000)
  
  return {
    prevTerm,
    nextTerm,
    daysAfter,
    hoursAfter,
    daysBefore,
    hoursBefore,
  }
}


const loadLocalNotes = (resultId: string): DivinationNote[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(`${LOCAL_NOTES_STORAGE_PREFIX}${resultId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DivinationNote[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveLocalNotes = (resultId: string, notes: DivinationNote[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${LOCAL_NOTES_STORAGE_PREFIX}${resultId}`, JSON.stringify(notes))
  } catch (e) {
    console.error("Failed to save local notes:", e)
  }
}

// 主内容组件
function ResultPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const resultId = params.id as string
  const from = searchParams.get('from')
  const normalizedResultId = resultId.startsWith('db-') ? resultId.substring(3) : resultId
  const isLocalResult = !isUUID(normalizedResultId)
  
  const handleLoginRedirect = useCallback(() => {
    const currentPath = `/tools/bazi/${resultId}`
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
    
    toast({
      title: '需要登录',
      description: '请先登录以继续操作，即将跳转...',
    })
    
    setTimeout(() => {
      router.push(loginUrl)
    }, 1500)
  }, [resultId, router, toast])

  const [payload, setPayload] = useState<StoredBaZiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [showAiSaveConfirm, setShowAiSaveConfirm] = useState(false)
  const [showAiNotOwnerConfirm, setShowAiNotOwnerConfirm] = useState(false)
  const [showAiCostConfirm, setShowAiCostConfirm] = useState(false)
  const [aiBalanceChecking, setAiBalanceChecking] = useState(false)
  const [pendingSaveAction, setPendingSaveAction] = useState<'ai' | 'note' | null>(null)
  const [aiPayIntent, setAiPayIntent] = useState<'preview' | 'unlock' | 'reanalyze'>('preview')
  
  // AI Streaming state
  const [aiStreamContent, setAiStreamContent] = useState('')
  const [isAiStreaming, setIsAiStreaming] = useState(false)
  const [aiStreamError, setAiStreamError] = useState<Error | null>(null)
  const [aiFeedback, setAiFeedback] = useState<'good' | 'bad' | null>(null)
  const [submittingAiFeedback, setSubmittingAiFeedback] = useState(false)
  const aiAbortControllerRef = useRef<AbortController | null>(null)
  const aiIdempotencyKeyRef = useRef<string | null>(null)
  const aiLastModeRef = useRef<'preview' | 'full'>('preview')
  const aiSectionRef = useRef<HTMLDivElement>(null)
  const savedOnceRef = useRef(false)
  const noteSectionRef = useRef<PrivateNotesSectionRef>(null)
  const resultViewTrackedRef = useRef<string | null>(null)
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  
  // Note state
  const [notes, setNotes] = useState<DivinationNote[]>([])
  const [aiResult, setAiResult] = useState('')
  const [aiPreviewResult, setAiPreviewResult] = useState('')
  const [aiResultAt, setAiResultAt] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  // Name editing state
  const [name, setName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameLoading, setNameLoading] = useState(false)
  const [questionLoading, setQuestionLoading] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'chart' | 'detailed' | 'relationships'>('basic')

  const displayNotes = useMemo(() => notes.filter((n) => !n.content.startsWith(AI_NOTE_PREFIX)), [notes])
  const recordIdForAi = savedRecordId || (isUUID(normalizedResultId) ? normalizedResultId : null)
  const aiStorageKey = recordIdForAi || normalizedResultId
  const canViewPrivateNotes = isLocalResult || isAuthor

  // 数据加载
  useEffect(() => {
    if (typeof window === 'undefined' || !resultId) return
    
    // Reset states when resultId changes
    setIsSaved(false)
    setSavedRecordId(null)
    setHasUnsavedChanges(false)
    setIsAuthor(false)
    setLoading(true)
    
    const loadResult = async () => {
      try {
        let actualId = resultId
        if (actualId.startsWith('db-')) {
          actualId = actualId.substring(3)
        }

        if (isUUID(actualId)) {
          const record = await getBaZiRecordById(actualId, false)
          if (record) {
            // Check authorship
            const currentUser = await getCurrentUser()
            if (currentUser && record.user_id === currentUser.id) {
              setIsAuthor(true)
            } else {
              setIsAuthor(false)
            }

            const nameVal = record.name || ''
            setName(nameVal)
            
            setPayload({
              name: nameVal,
              gender: record.gender,
              dateISO: record.dateISO,
              trueSolarDateISO: record.trueSolarDateISO,
              hour: record.hour,
              minute: record.minute,
              city: record.city,
              solarTimeCorrection: record.solarTimeCorrection,
              earlyZiHour: record.earlyZiHour,
              result: record.result as unknown as BaZiResult,
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
            router.push('/tools/bazi')
          }
        } else {
          // 从 localStorage 加载
          const stored = localStorage.getItem(BAZI_RESULTS_LIST_STORAGE_KEY)
          if (stored) {
            const list = JSON.parse(stored) as StoredBaZiResultWithId[]
            const found = list.find((r: StoredBaZiResultWithId) => r.id === resultId)
            if (found) {
              setName(found.name || '')
              setPayload(found)
              setIsAuthor(false)
              setIsSaved(false)
              setSavedRecordId(null)
              setHasUnsavedChanges(false)
              setNotes(loadLocalNotes(resultId))
              const cached = localStorage.getItem(`${AI_RESULT_STORAGE_PREFIX}${normalizedResultId}`)
              if (cached) {
                setAiResult(cached)
                setAiResultAt(null)
              } else {
                setAiResult('')
                setAiResultAt(null)
              }
            } else {
              const legacy = localStorage.getItem(BAZI_RESULT_STORAGE_KEY)
              if (legacy) {
                const legacyData = JSON.parse(legacy)
                setName(legacyData.name || '')
                setPayload(legacyData)
                setIsAuthor(false)
                setIsSaved(false)
                setSavedRecordId(null)
                setHasUnsavedChanges(false)
                setNotes(loadLocalNotes(resultId))
              } else {
                router.push('/tools/bazi')
              }
            }
          } else {
            router.push('/tools/bazi')
          }
        }
      } catch (e) {
        console.error("Failed to load result:", e)
        router.push('/tools/bazi')
      } finally {
        setLoading(false)
      }
    }
    loadResult()
  }, [router, resultId])

  const calculatedData = useMemo(() => {
    if (!payload) return null
    const date = new Date(payload.dateISO)
    const earlyZiHour = payload.earlyZiHour ?? false
    // 如果hour是时辰代码（农历模式），用于计算时柱
    const selectedHour = payload.hour && !/^\d+$/.test(payload.hour) ? payload.hour : undefined
    const ganZhiInfo = getGanZhiInfo(date, earlyZiHour, selectedHour)
    const stems = ganZhiInfo.stems || []
    const branches = ganZhiInfo.branches || []
    if (stems.length < 4) return null
    const kongWang = getKongWangPairForStemBranch(stems[2].char, branches[2]?.char || '')
    
    return {
      date,
      stems,
      branches,
      kongWang,
    }
  }, [payload])

  useEffect(() => {
    if (!payload || !calculatedData) return
    const key = normalizedResultId
    if (resultViewTrackedRef.current === key) return
    resultViewTrackedRef.current = key
    trackEvent('tool_result_view', {
      type: 'bazi',
      gender: payload.gender,
      is_solar_correction: payload.solarTimeCorrection,
      has_ai_result: !!aiResult,
      from,
    })
  }, [payload, calculatedData, normalizedResultId, aiResult, from])

  const persistAiResult = useCallback(async (result: string) => {
    if (!result.trim()) return
    if (savedOnceRef.current) return
    savedOnceRef.current = true

    const recordId = recordIdForAi
    if (recordId && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`${AI_RESULT_STORAGE_PREFIX}${recordId}`, result)
      } catch {
      }
    }

    // Update state to show as final result
    setAiResult(result)
    setAiResultAt(new Date().toISOString())
  }, [recordIdForAi])

  const submitAiFeedback = useCallback(async (rating: 'good' | 'bad') => {
    if (submittingAiFeedback) return
    setSubmittingAiFeedback(true)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) return
      const recordId = recordIdForAi || normalizedResultId
      setAiFeedback(rating)
      trackEvent('ai_feedback', { rating, record_id: recordId, divination_type: 'bazi' })
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          record_id: recordId,
          divination_type: 'bazi',
        }),
      })
    } finally {
      setSubmittingAiFeedback(false)
    }
  }, [normalizedResultId, recordIdForAi, submittingAiFeedback])

  const startAiAnalysis = useCallback(async (mode: 'preview' | 'full') => {
    if (!calculatedData || !payload) {
      console.warn('Cannot analyze: data is missing')
      return
    }

    const startedAt = Date.now()
    aiLastModeRef.current = mode
    aiAbortControllerRef.current?.abort()
    const controller = new AbortController()
    aiAbortControllerRef.current = controller

    savedOnceRef.current = false
    setAiStreamContent('')
    setAiStreamError(null)
    setIsAiStreaming(true)

    if (mode === 'full' && !aiIdempotencyKeyRef.current) {
      aiIdempotencyKeyRef.current = generateIdempotencyKey()
    }

    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('请先登录后再使用 AI 分析')
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      headers.Authorization = `Bearer ${token}`

      const response = await fetch('/api/ai/analyze-bazi', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name || undefined,
          gender: payload.gender,
          dateISO: payload.dateISO,
          result: payload.result,
          idempotencyKey: mode === 'full' ? aiIdempotencyKeyRef.current : undefined,
          mode,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        let isHandledError = false
        let errorMessage = text
        try {
          const json = JSON.parse(text)
          if (json.error) {
            isHandledError = true
            errorMessage = json.error
          }
        } catch {}
        if (mode === 'full' && isHandledError) {
          aiIdempotencyKeyRef.current = null
        }
        throw new Error(errorMessage || `HTTP ${response.status}`)
      }
      
      if (!response.body) throw new Error('Empty response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accumulatedContent = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value, { stream: !done })
        accumulatedContent += chunkValue
        setAiStreamContent(accumulatedContent)
      }

      setIsAiStreaming(false)
      if (mode === 'full') {
        setAiPreviewResult('')
        persistAiResult(accumulatedContent)
      } else {
        setAiPreviewResult(accumulatedContent)
        setAiResultAt(new Date().toISOString())
      }
      trackEvent('ai_response_complete', {
        latency: Date.now() - startedAt,
        token_usage: null,
        content_length: accumulatedContent.length,
        divination_type: 'bazi',
        mode,
      })
      
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('AI Analysis Error:', err)
      setAiStreamError(err instanceof Error ? err : new Error(String(err)))
      setIsAiStreaming(false)
      trackEvent('ai_analysis_error', {
        error: err instanceof Error ? err.message : String(err),
        divination_type: 'bazi',
        mode,
      })
    }
  }, [calculatedData, payload, name, persistAiResult])

  const handleScrollToResult = useCallback(() => {
    // 如果元素已经存在，立即滚动
    if (aiSectionRef.current) {
      requestAnimationFrame(() => {
        aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }
    
    // 如果元素不存在，等待它出现（最多尝试15次，每次间隔150ms）
    let attempts = 0
    const maxAttempts = 15
    
    const tryScroll = () => {
      if (aiSectionRef.current) {
        requestAnimationFrame(() => {
          aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        return
      }
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(tryScroll, 150)
      }
    }
    
    // 延迟一点时间后开始尝试，给 React 时间更新 DOM
    setTimeout(tryScroll, 100)
  }, [])

  const handleAiAnalyzeClick = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

    if (aiResult) {
      if (isSaved && !isAuthor) {
        toast({ title: '提示', description: '你不是该排盘作者，AI 分析结果不会保存到该排盘记录' })
      }
      setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      return
    }

    if (!isSaved) {
      setPendingSaveAction('ai')
      setShowAiSaveConfirm(true)
      return
    }

    if (!isAuthor) {
      setShowAiNotOwnerConfirm(true)
      return
    }

    setShowAiCostConfirm(true)
  }, [aiResult, isAuthor, isSaved, toast, handleLoginRedirect])

  // 移动端专用的AI分析处理函数
  const handleMobileAiAnalyzeClick = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

    if (aiResult || aiPreviewResult) {
      if (isSaved && !isAuthor) {
        toast({
          title: '提示',
          description: '你不是该排盘作者，AI 分析结果不会保存到该排盘记录',
        })
      }
      handleScrollToResult()
      return
    }

    // 对于移动端，直接触发分析流程
    // 如果需要保存，会通过 toast 提示用户
    if (!isSaved) {
      toast({
        title: '需要先保存',
        description: '请先保存到云端后再使用 AI 分析',
        variant: 'destructive',
      })
      return
    }

    if (!isAuthor) {
      // 非作者也可以分析，但结果不会保存
      setAiPayIntent('preview')
      setShowAiNotOwnerConfirm(true)
      return
    }

    startAiAnalysis('preview')
  }, [
    aiResult,
    aiPreviewResult,
    isSaved,
    isAuthor,
    toast,
    handleLoginRedirect,
    handleScrollToResult,
    startAiAnalysis,
  ])

  const handleUnlockFullRequest = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

    if (!isSaved) {
      setPendingSaveAction('ai')
      setShowAiSaveConfirm(true)
      return
    }

    setAiPayIntent('unlock')
    if (!isAuthor) {
      setShowAiNotOwnerConfirm(true)
      return
    }
    setShowAiCostConfirm(true)
  }, [handleLoginRedirect, isAuthor, isSaved])

  const handleConfirmSaveForAi = async () => {
    setShowAiSaveConfirm(false)
    setPendingSaveAction(null)
    const recordId = await saveRecordToCloud(true)
    if (recordId) {
      toast({ title: '已保存到云端', description: '请再次点击 AI 分析开始推演' })
    }
  }

  const handleConfirmAiNotOwner = () => {
    setShowAiNotOwnerConfirm(false)
    if (aiPayIntent === 'preview') {
      startAiAnalysis('preview')
      return
    }
    setShowAiCostConfirm(true)
  }

  const handleConfirmAiAnalyze = async () => {
    setAiBalanceChecking(true)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setShowAiCostConfirm(false)
        handleLoginRedirect()
        return
      }

      if (!isSaved) {
        setShowAiCostConfirm(false)
        setPendingSaveAction('ai')
        setShowAiSaveConfirm(true)
        return
      }

      const growth = await getUserGrowth()
      const balance = growth?.yiCoins
      if (typeof balance !== 'number') {
        toast({ title: '无法使用 AI 分析', description: '无法获取易币余额，请稍后重试', variant: 'destructive' })
        return
      }

      if (balance < 50) {
        setShowAiCostConfirm(false)
        toast({ title: '易币余额不足', description: '当前易币不足 50，无法使用 AI 分析', variant: 'destructive' })
        return
      }

      setShowAiCostConfirm(false)
      if (aiPayIntent === 'reanalyze') handleResetIdempotencyKey()
      startAiAnalysis('full')
      setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } finally {
      setAiBalanceChecking(false)
    }
  }

  const handleResetIdempotencyKey = useCallback(() => {
    aiIdempotencyKeyRef.current = null
  }, [])

  const persistNameUpdate = useCallback(async (nextName: string) => {
    const finalName = (nextName || '').trim()

    if (!isSaved || !savedRecordId || !isAuthor) {
      toast({ title: '请先保存到云端', description: '保存后才能修改姓名', variant: 'destructive' })
      return
    }

    if (isSaved && savedRecordId && isAuthor) {
      setNameLoading(true)
      try {
        const { success, message } = await updateBaZiName(savedRecordId, finalName)
        if (success) {
          toast({ title: '更新成功', description: '姓名已更新' })
          setIsEditingName(false)
          setHasUnsavedChanges(false)
          setName(finalName)
          setPayload((prev) => (prev ? { ...prev, name: finalName } : prev))
          return
        }
        toast({ title: '更新失败', description: message, variant: 'destructive' })
      } catch {
        toast({ title: '更新失败', variant: 'destructive' })
      } finally {
        setNameLoading(false)
      }
      return
    }

    setName(finalName)
    setIsEditingName(false)
    setHasUnsavedChanges(false)
    setPayload((prev) => (prev ? { ...prev, name: finalName } : prev))
  }, [isSaved, savedRecordId, isAuthor, toast])

  const saveRecordToCloud = useCallback(async (showToast: boolean = true): Promise<string | null> => {
    // If already saved and no unsaved changes, don't do anything
    if (isSaved && !hasUnsavedChanges) {
      if (showToast) toast({ title: '排盘记录已保存', description: '该记录已保存到数据库' })
      return savedRecordId || (isUUID(resultId) ? resultId : null)
    }

    // If already saved and has unsaved changes, update the name
    if (isSaved && savedRecordId && hasUnsavedChanges) {
      setQuestionLoading(true)
      try {
        const { success, message } = await updateBaZiName(savedRecordId, name)
        if (success) {
          if (showToast) toast({ title: '更新成功', description: '排盘信息已更新' })
          setHasUnsavedChanges(false)
          // Update local payload name
          if (payload) {
            setPayload({ ...payload, name: name || '' })
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

    // Additional check: if resultId is a UUID, the record is already saved
    // This prevents duplicate saves when the page is refreshed and state hasn't fully loaded
    if (isUUID(normalizedResultId)) {
      // If we have a savedRecordId, use it
      if (savedRecordId) {
        setIsSaved(true)
        setHasUnsavedChanges(false)
        if (showToast) toast({ title: '排盘记录已保存', description: '该记录已保存到数据库' })
        return savedRecordId
      }
      // If savedRecordId is not set but resultId is UUID, verify the record exists
      try {
        const record = await getBaZiRecordById(normalizedResultId, false)
        if (record) {
          setIsSaved(true)
          setSavedRecordId(normalizedResultId)
          setHasUnsavedChanges(false)
          // Check authorship
          const currentUser = await getCurrentUser()
          if (currentUser && record.user_id === currentUser.id) {
            setIsAuthor(true)
          } else {
            setIsAuthor(false)
          }
          if (showToast) toast({ title: '排盘记录已保存', description: '该记录已保存到数据库' })
          return normalizedResultId
        }
      } catch (e) {
        console.error('Error checking existing record:', e)
        // If check fails, continue with save (might be a new record with UUID-like ID)
      }
    }

    if (!payload || saving || !calculatedData) return savedRecordId || (isUUID(resultId) ? resultId : null)
    
    setSaving(true)
    try {
      const res = await saveBaZiRecord({
        name: name,
        gender: payload.gender,
        dateISO: payload.dateISO,
        trueSolarDateISO: payload.trueSolarDateISO,
        hour: payload.hour,
        minute: payload.minute,
        city: payload.city,
        solarTimeCorrection: payload.solarTimeCorrection,
        earlyZiHour: payload.earlyZiHour,
        result: payload.result as unknown as Record<string, unknown>,
      })
      if (res.success) {
        setIsSaved(true)
        setIsAuthor(true)
        setSavedRecordId(res.recordId || null)
        setHasUnsavedChanges(false)
        if (showToast) toast({ title: '保存成功' })
        const newRecordId = res.recordId
        if (newRecordId && isLocalResult) {
          // Get local notes from component
          const currentNotes = noteSectionRef.current?.getNotes() || []
          const localNotes = currentNotes.filter((n) => !n.content.startsWith(AI_NOTE_PREFIX))
          if (localNotes.length > 0) {
            try {
              await Promise.all(localNotes.map((n) => addDivinationNote(newRecordId, n.content)))
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem(`${LOCAL_NOTES_STORAGE_PREFIX}${resultId}`)
              }
              const fetchedNotes = await getDivinationNotes(newRecordId)
              setNotes(fetchedNotes)
            } catch {
              // ignore
            }
          }
          
          // Redirect to the new cloud record ID to prevent duplicate saves
          router.replace(`/tools/bazi/${newRecordId}${from ? `?from=${from}` : ''}`)
        }
        return res.recordId || null
      } else {
        if (res.message === '请先登录') {
          handleLoginRedirect()
        } else if (showToast) {
          toast({ title: '保存失败', description: res.message, variant: 'destructive' })
        }
        return null
      }
    } catch {
      if (showToast) toast({ title: '保存失败', variant: 'destructive' })
      return null
    } finally {
      setSaving(false)
    }
  }, [payload, saving, isSaved, savedRecordId, resultId, toast, calculatedData, name, hasUnsavedChanges, isLocalResult, handleLoginRedirect, router, from])

  const handlePublish = useCallback(async () => {
    let recordIdToUse = savedRecordId || (isUUID(normalizedResultId) ? normalizedResultId : null)
    if (!isSaved || hasUnsavedChanges) recordIdToUse = await saveRecordToCloud(true)
    if (recordIdToUse) router.push(`/community/publish?tab=divination&recordId=${recordIdToUse}`)
    else toast({ title: '无法发布', description: '无法获取排盘记录ID', variant: 'destructive' })
  }, [isSaved, hasUnsavedChanges, savedRecordId, normalizedResultId, saveRecordToCloud, router, toast])

  // 分享功能 - 复用PC端的分享逻辑
  const handleShareImage = useCallback(() => {
    if (!payload?.result || !payload.result.pillars || payload.result.pillars.length !== 4) {
      toast({
        title: '无法生成分享图',
        description: '缺少必要的排盘数据',
        variant: 'destructive',
      })
      return
    }
    setShareDialogOpen(true)
    trackEvent('tool_result_share', {
      share_channel: 'share_dialog',
      has_ai_content: !!aiResult,
      type: 'bazi',
    })
  }, [payload, toast, aiResult])

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    
    if (!isSaved) {
      const newNote: DivinationNote = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: newNoteContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updatedNotes = [newNote, ...notes]
      setNotes(updatedNotes)
      saveLocalNotes(resultId, updatedNotes)
      setNewNoteContent('')
      toast({ title: '本地笔记已添加', description: '保存到云端后将自动同步' })
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

    const recordIdToUse = savedRecordId || (isUUID(resultId) ? resultId : null)
    if (!recordIdToUse) {
      toast({ title: '添加失败', description: '无法获取排盘记录ID', variant: 'destructive' })
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

    if (noteId.startsWith('local_') || !isSaved) {
      const updatedNotes = notes.map(n => n.id === noteId ? { ...n, content: editNoteContent, updated_at: new Date().toISOString() } : n)
      setNotes(updatedNotes)
      saveLocalNotes(resultId, updatedNotes)
      setEditingNoteId(null)
      setEditNoteContent('')
      toast({ title: '本地笔记已更新' })
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

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

    if (noteId.startsWith('local_') || !isSaved) {
      const updatedNotes = notes.filter(n => n.id !== noteId)
      setNotes(updatedNotes)
      saveLocalNotes(resultId, updatedNotes)
      toast({ title: '本地笔记已删除' })
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

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

  const { date, stems, branches, kongWang } = calculatedData
  
  // 计算额外信息
  const zodiacSign = getZodiacSign(date)
  const lunarMansion = getLunarMansion(date)

  // 辅助函数：优先使用保存的计算结果（如果是对象），否则重新计算
  const getComputedInfo = <T,>(saved: any, calculator: () => T): T => {
    if (saved && typeof saved === 'object') return saved as T
    return calculator()
  }

  const taiYuan = getComputedInfo(payload.result.basic.taiYuan, () => getTaiYuan(stems[1]?.char || '', branches[1]?.char || ''))
  const mingGong = getComputedInfo(payload.result.basic.mingGong, () => getMingGong(stems[0]?.char || '', branches[1]?.char || '', branches[3]?.char || ''))
  const shenGong = getComputedInfo(payload.result.basic.shenGong, () => getShenGong(stems[0]?.char || '', branches[1]?.char || '', branches[3]?.char || ''))
  const taiXi = getComputedInfo(payload.result.basic.taiXi, () => getTaiXi(stems[2]?.char || '', branches[2]?.char || ''))
  const mingGua = getComputedInfo(payload.result.basic.mingGua, () => getMingGua(date.getFullYear(), payload.gender))

  const renYuanSiLing = getRenYuanSiLing(branches[1]?.char || '')
  const solarTermInfo = getSolarTermInfo(date)
  
  // 获取农历完整信息
  // 如果hour是时辰代码（农历模式），用于显示农历日期
  const selectedHour = payload.hour && !/^\d+$/.test(payload.hour) ? payload.hour : undefined
  const lunar = (() => {
    try {
      const lunarDate = payload.result.basic.lunarDate
      if (lunarDate && lunarDate.includes('年')) {
        return lunarDate.split(' ')[0] + ' ' + lunarDate.split(' ')[1]
      }
      return getLunarDateStringWithoutYear(date, selectedHour)
    } catch {
      return getLunarDateStringWithoutYear(date, selectedHour)
    }
  })()
  
  // 格式化真太阳时：如果启用了校正且有校正后的时间，使用校正后的时间；否则显示--
  const trueSolarTime = payload.solarTimeCorrection && payload.trueSolarDateISO
    ? formatDateTimeFull(payload.trueSolarDateISO)
    : '--'
  
  // 获取出生地区
  const birthPlace = payload.city || payload.result.basic.place || '未知地北京时间--'
  
  // 获取性别显示
  const genderText = payload.gender === 'male' ? '男' : '女'
  const yinYangText = payload.gender === 'male' ? '乾造' : '坤造'
  
  // 获取生肖
  const zodiac = payload.result.basic.zodiac || ''

  return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="min-h-screen bg-paper-50 relative flex justify-center p-0 lg:p-8 font-sans">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 relative z-10">
          <div className="flex-1 min-w-0">
            <Card className="border-none shadow-none lg:shadow-sm bg-white min-h-[50rem] relative overflow-hidden flex flex-col rounded-none lg:rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#0f003f] via-[#e40404] to-[#2d0269]"></div>
              <div className="p-4 sm:p-8 lg:p-12 flex-1 pb-32 lg:pb-12">
                
                {/* 1. 标题区 */}
                <div className="mb-6 lg:mb-8 mt-2 lg:mt-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <span className="text-[0.625rem] font-medium text-[#C82E31] bg-[#C82E31]/10 border border-[#C82E31]/20 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                        八字排盘
                      </span>
                      <span className="text-[0.625rem] sm:text-xs text-stone-400 font-mono tracking-wider truncate">
                        {payload.gender === 'male' ? '乾造' : '坤造'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-stone-800 leading-snug tracking-tight break-words flex-1">
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => {
                                setName(e.target.value)
                                if (isSaved && e.target.value !== (payload?.name || '')) {
                                  setHasUnsavedChanges(true)
                                }
                              }}
                              className="flex-1 border-b border-stone-300 focus:border-[#C82E31] outline-none bg-transparent"
                              autoFocus
                              onBlur={() => {
                                if (name === (payload?.name || '')) {
                                  setIsEditingName(false)
                                }
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && name !== (payload?.name || '')) {
                                  await persistNameUpdate(name)
                                } else if (e.key === 'Escape') {
                                  setName(payload?.name || '')
                                  setIsEditingName(false)
                                  setHasUnsavedChanges(false)
                                }
                              }}
                            />
                            {name !== (payload?.name || '') && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  onClick={() => {
                                    setName(payload?.name || '')
                                    setIsEditingName(false)
                                    setHasUnsavedChanges(false)
                                  }}
                                  variant="ghost"
                                  size="icon-sm"
                                  className="p-1 text-stone-400 hover:text-stone-600"
                                  disabled={nameLoading}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={async () => {
                                    await persistNameUpdate(name)
                                  }}
                                  variant="ghost"
                                  size="icon-sm"
                                  className="p-1 text-green-600 hover:text-green-700"
                                  disabled={nameLoading}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span 
                            onClick={() => {
                              if (isSaved && isAuthor) {
                                setIsEditingName(true)
                              } else if (!isSaved) {
                                setIsEditingName(true)
                              }
                            }} 
                            className={(isSaved && isAuthor) || !isSaved ? "cursor-pointer hover:text-[#C82E31]/80 transition-colors border-b border-transparent hover:border-stone-200" : ""}
                            title={(isSaved && isAuthor) || !isSaved ? "点击修改姓名" : ""}
                          >
                            {name || '未填写姓名'}
                          </span>
                        )}
                      </h1>
                      {((isSaved && isAuthor) || !isSaved) && !isEditingName && (
                        <Button 
                          onClick={() => setIsEditingName(true)}
                          variant="ghost"
                          size="icon-sm"
                          className="p-1 text-stone-400 hover:text-[#C82E31]"
                        >
                          <PenLine className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Tab 导航和内容 */}
                <div className="mb-8 lg:mb-12">
                  {/* Tab 导航 */}
                  <div className="flex items-center gap-1 mb-6 border-b border-stone-200/60">
                    {([
                      { id: 'basic' as const, label: '基本信息' },
                      { id: 'chart' as const, label: '基本排盘' },
                      { id: 'detailed' as const, label: '详细排盘' },
                      { id: 'relationships' as const, label: '刑冲會合法則' },
                    ] as const).map((tab) => (
                      <Button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        variant="ghost"
                        className={cn(
                          "px-4 py-2.5 text-sm font-medium transition-colors relative rounded-none",
                          activeTab === tab.id
                            ? "text-[#C82E31]"
                            : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        {tab.label}
                        {activeTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C82E31]"></div>
                        )}
                      </Button>
                    ))}
                  </div>

                  {/* Tab 内容 */}
                  <div className="min-h-[25rem]">
                    {/* 基本信息 Tab */}
                    {activeTab === 'basic' && (
                      <BaZiBasicInfo
                        name={name}
                        payload={payload}
                        date={date}
                        lunar={lunar}
                        zodiac={zodiac}
                        trueSolarTime={trueSolarTime}
                        birthPlace={birthPlace}
                        renYuanSiLing={renYuanSiLing}
                        solarTermInfo={solarTermInfo}
                        taiYuan={taiYuan}
                        kongWang={kongWang}
                        mingGong={mingGong}
                        taiXi={taiXi}
                        shenGong={shenGong}
                        mingGua={mingGua}
                      />
                    )}

                    {/* 排盘结果 Tab */}
                    {activeTab === 'chart' && payload.result && (
                      <BaZiChart pillars={payload.result.pillars} />
                    )}

                    {/* 详细排盘 Tab */}
                    {activeTab === 'detailed' && payload.result && (
                      <BaZiDetailedTab
                        result={payload.result}
                        date={date}
                        stems={stems}
                        branches={branches}
                      />
                    )}

                    {/* 刑冲會合法則 Tab */}
                    {activeTab === 'relationships' && payload.result && (
                      <BaZiRelationships pillars={payload.result.pillars} />
                    )}
                  </div>
                </div>

                {/* AI 分析结果 */}
                {(aiResult || aiPreviewResult || isAiStreaming || aiStreamError) && (
                  <div ref={aiSectionRef} className="mb-8 bg-white border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm scroll-mt-20">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-[#C82E31]" />
                      <h4 className="font-serif font-bold text-stone-800 text-base lg:text-lg tracking-wide">
                        AI 分析结果
                      </h4>
                      {isAiStreaming && <div className="w-4 h-4 border-2 border-[#C82E31] border-t-transparent rounded-full animate-spin"></div>}
                      {!isAiStreaming && aiResultAt && <span className="text-[0.625rem] sm:text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{formatDateTime(aiResultAt)}</span>}
                    </div>
                    
                    {aiStreamError ? (
                      <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm mb-4">
                        分析出错: {aiStreamError.message}
                        <Button variant="outline" size="sm" onClick={() => startAiAnalysis(aiLastModeRef.current)} className="ml-4 border-red-200 hover:bg-red-100">重试</Button>
                      </div>
                    ) : (
                      <div className="prose prose-stone max-w-none font-serif text-stone-800 prose-headings:text-[#C82E31] prose-strong:text-[#C82E31]">
                        <ReactMarkdown>{isAiStreaming ? aiStreamContent : (aiResult || aiPreviewResult)}</ReactMarkdown>
                      </div>
                    )}

                    {!isAiStreaming && !aiStreamError && !aiResult && aiPreviewResult && (
                      <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-stone-600">
                            当前仅展示 20% 预览内容，查看完整内容需 50 易币。
                          </div>
                          <Button
                            size="sm"
                            className="bg-[#C82E31] hover:bg-[#A61B1F] text-white"
                            onClick={handleUnlockFullRequest}
                          >
                            解锁完整内容
                          </Button>
                        </div>
                      </div>
                    )}
                  
                  {!isAiStreaming && aiResult && !aiStreamError && (
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
                      <div className="text-xs text-stone-500">这次 AI 详批有帮助吗？</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={submittingAiFeedback}
                          className={aiFeedback === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200'}
                          onClick={() => submitAiFeedback('good')}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          有用
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={submittingAiFeedback}
                          className={aiFeedback === 'bad' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-stone-200'}
                          onClick={() => submitAiFeedback('bad')}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          无用
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                )}

                {/* 私密笔记 */}
                <PrivateNotesSection
                  ref={noteSectionRef}
                  recordId={savedRecordId || resultId}
                  isSaved={isSaved}
                  canView={canViewPrivateNotes}
                  aiNotePrefix={AI_NOTE_PREFIX}
                  localStoragePrefix={LOCAL_NOTES_STORAGE_PREFIX}
                  onLoginRedirect={handleLoginRedirect}
                />

                {/* 返回上一页按钮 */}
                <div className="lg:hidden mt-4 mb-8">
                  <Button 
                    variant="outline" 
                    className="w-full h-11 text-stone-500 border-stone-200 bg-transparent hover:bg-stone-50"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回上一页
                  </Button>
                </div>

              </div>
            </Card>
          </div>

          {/* 右侧工具栏 */}
          <div className="hidden lg:flex w-72 flex-col gap-4 shrink-0 self-start lg:sticky lg:top-8">
            <AiAnalysisCard
              aiStage={aiResult ? 'full' : aiPreviewResult ? 'preview' : 'none'}
              isSaved={isSaved}
              isAuthor={isAuthor}
              saving={saving}
              onStartAnalysis={startAiAnalysis}
              onSaveToCloud={saveRecordToCloud}
              onLoginRedirect={handleLoginRedirect}
              onResetIdempotencyKey={handleResetIdempotencyKey}
              onScrollToResult={handleScrollToResult}
            />
            <ResultActionsCard
              isSaved={isSaved}
              hasUnsavedChanges={hasUnsavedChanges}
              saving={saving}
              loading={nameLoading || questionLoading}
              isAuthor={isAuthor}
              isLocalResult={isLocalResult}
              onSave={() => saveRecordToCloud(true)}
              onPublish={handlePublish}
              onDownload={handleShareImage}
              onWriteNote={() => noteSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              baziResult={payload?.result}
              baziPayload={payload ? {
                name: payload.name,
                gender: payload.gender,
                dateISO: payload.dateISO,
              } : undefined}
              aiResult={aiResult}
            />
            <div className="mt-8 text-center px-4 lg:px-0">
              <div className="flex flex-col gap-2">
                {(from === 'community' || from === 'profile') && (
                  <Button variant="outline" className="w-full border-stone-200 bg-[#fdfbf7] text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.back()}>
                    <ArrowLeft className="w-3.5 h-3.5" /> 返回上一页
                  </Button>
                )}
                <Button variant="outline" className="w-full border-stone-200 bg-[#fdfbf7] text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.push('/tools/bazi')}>
                  <RotateCcw className="w-3.5 h-3.5" /> 重新排盘
                </Button>
              </div>
            </div>
          </div>

          {/* 移动端底部固定工具栏 */}
          <MobileResultActionsBar
            reroutePath="/tools/bazi"
            isSaved={isSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            saving={saving}
            loading={nameLoading || questionLoading}
            onSave={() => saveRecordToCloud(true)}
            noteSectionRef={noteSectionRef}
            aiSectionRef={aiSectionRef}
            canViewPrivateNotes={canViewPrivateNotes}
            onShare={handleShareImage}
            onPublish={handlePublish}
            showPublish={isAuthor || isLocalResult}
            onAiAnalyze={handleMobileAiAnalyzeClick}
          />
        </div>
      </div>

      {/* 分享图对话框 */}
      {payload?.result && payload.result.pillars && payload.result.pillars.length === 4 && (
        <ShareResultDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          baziResult={payload.result}
          baziPayload={{
            name: payload.name,
            gender: payload.gender,
            dateISO: payload.dateISO,
          }}
          aiResult={aiResult}
        />
      )}

      {/* AI 分析确认弹窗 */}
      <Dialog open={showAiCostConfirm} onOpenChange={setShowAiCostConfirm}>
        <DialogContent className="bg-white rounded-xl">
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-500 fill-current" />
            </div>
            <DialogTitle className="mb-2">
              {aiPayIntent === 'reanalyze' ? '确认重新分析' : '解锁完整内容'}
            </DialogTitle>
            <DialogDescription>
              本次操作将扣除{" "}
              <span className="font-bold text-[#C82E31] text-base">50</span>{" "}
              易币
              <br />
              {aiPayIntent === 'reanalyze' ? '以重新生成完整 AI 分析内容。' : '以查看完整 AI 分析内容。'}
            </DialogDescription>
          </div>
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowAiCostConfirm(false)}
              disabled={aiBalanceChecking}
              className="rounded-full w-full sm:w-auto px-8 order-2 sm:order-1"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmAiAnalyze}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full w-full sm:w-auto px-8 order-1 sm:order-2"
              disabled={aiBalanceChecking}
            >
              {aiBalanceChecking ? "查询余额..." : "确认支付"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 保存确认弹窗 */}
      <Dialog open={showAiSaveConfirm} onOpenChange={setShowAiSaveConfirm}>
        <DialogContent className="bg-white rounded-xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>需要先保存到云端</DialogTitle>
            <DialogDescription>
              使用该功能前，需要先将本次排盘保存到云端。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAiSaveConfirm(false)}
              disabled={saving}
              className="rounded-full w-full sm:w-auto order-2 sm:order-1"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmSaveForAi}
              disabled={saving}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full w-full sm:w-auto order-1 sm:order-2"
            >
              {saving ? "保存中..." : "保存到云端"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 非作者确认弹窗 */}
      <Dialog
        open={showAiNotOwnerConfirm}
        onOpenChange={setShowAiNotOwnerConfirm}
      >
        <DialogContent className="bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle>非作者提示</DialogTitle>
            <DialogDescription>
              你不是该排盘作者，AI 分析结果将仅在当前设备临时显示。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAiNotOwnerConfirm(false)}
              className="rounded-full w-full sm:w-auto order-2 sm:order-1"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmAiNotOwner}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full w-full sm:w-auto order-1 sm:order-2"
            >
              继续分析
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
