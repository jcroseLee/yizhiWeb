'use client'

import { toPng } from 'html-to-image'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown, ChevronUp,
  CloudFog,
  Loader2,
  Moon,
  PenLine,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Sun,
  X,
  Zap
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

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
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import {
  LINE_LABELS,
  RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId
} from '@/lib/constants/divination'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser, getSession } from '@/lib/services/auth'
import { getUserGrowth } from '@/lib/services/growth'
import {
  addDivinationNote,
  getDivinationNotes,
  getDivinationRecordById,
  saveDivinationRecord,
  updateDivinationNote,
  updateDivinationQuestion,
  type DivinationNote
} from '@/lib/services/profile'
import { buildLineDisplay } from '@/lib/utils/divinationLines'
import { buildChangedLines as buildChangedLinesUtil } from '@/lib/utils/divinationLineUtils'
import { calculateChangedLineDetails, calculateLineDetails, getExtendedShenSha, getFuShenAndGuaShen, getHexagramFullInfo, getHexagramNature } from '@/lib/utils/liuyaoDetails'
import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateStringWithoutYear } from '@/lib/utils/lunar'
import { solarTermTextFrom } from '@/lib/utils/solarTerms'
import { AiAnalysisCard } from '../../components/AiAnalysisCard'
import { HexagramLine } from '../../components/HexagramLine'
import LiuyaoShareCard from '../../components/LiuyaoShareImage'
import { MobileResultActionsBar } from '../../components/MobileResultActionsBar'
import { PrivateNotesSection, type PrivateNotesSectionRef } from '../../components/PrivateNotesSection'
import { ResultActionsCard } from '../../components/ResultActionsCard'
import { ShenShaList } from '../../components/ShenShaList'

const GLOBAL_STYLES = `
  .font-serif-sc { font-family: "Source Han Serif CN", "Source Han Serif SC", "Source Han Serif", "Noto Serif SC", "Songti SC", serif; }
  .writing-vertical { writing-mode: vertical-rl; }
`

const AI_NOTE_PREFIX = '【AI详批】'
const AI_RESULT_STORAGE_PREFIX = 'aiResult:'
const LOCAL_NOTES_STORAGE_PREFIX = 'divinationLocalNotes:'
const stripAiNotePrefix = (content: string) => content.replace(/^【AI详批】\n?/, '')

// --- 纯函数工具类 ---
const isUUID = (str: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Generate UUID for idempotency
const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
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

const buildChangedLines = buildChangedLinesUtil

// --- 子组件: 爻行显示 (核心修改) ---
// Moved to ../components/HexagramLine.tsx


// --- 子组件: 神煞列表 ---
// Moved to ../components/ShenShaList.tsx

// --- 子组件: 功能按钮 (移动端专用) ---
// Moved to ../components/ActionButton.tsx

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
  const isLocalResult = !isUUID(normalizedResultId)
  
  const handleLoginRedirect = useCallback(() => {
    // 构造登录重定向 URL，包含当前页面路径
    const currentPath = `/tools/6yao/${resultId}`
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
    
    toast({
      title: '需要登录',
      description: '请先登录以继续操作，即将跳转...',
    })
    
    // 延迟跳转，让用户看清提示
    setTimeout(() => {
      router.push(loginUrl)
    }, 1500)
  }, [resultId, router, toast])

  const [payload, setPayload] = useState<StoredDivinationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [showShenSha, setShowShenSha] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [showAiSaveConfirm, setShowAiSaveConfirm] = useState(false)
  const [showAiNotOwnerConfirm, setShowAiNotOwnerConfirm] = useState(false)
  const [showAiCostConfirm, setShowAiCostConfirm] = useState(false)
  const [aiBalanceChecking, setAiBalanceChecking] = useState(false)
  const [pendingSaveAction, setPendingSaveAction] = useState<'ai' | 'note' | null>(null)
  
  // AI Streaming state
  const [aiStreamContent, setAiStreamContent] = useState('')
  const [isAiStreaming, setIsAiStreaming] = useState(false)
  const [aiStreamError, setAiStreamError] = useState<Error | null>(null)
  const aiAbortControllerRef = useRef<AbortController | null>(null)
  const aiIdempotencyKeyRef = useRef<string | null>(null)
  const aiSectionRef = useRef<HTMLDivElement>(null)
  const savedOnceRef = useRef(false)
  const noteSectionRef = useRef<PrivateNotesSectionRef>(null)
  const shareImageRef = useRef<HTMLDivElement>(null)
  
  // Note state
  const [notes, setNotes] = useState<DivinationNote[]>([])
  const [aiResult, setAiResult] = useState('')
  const [aiResultAt, setAiResultAt] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  
  // Question editing state
  const [question, setQuestion] = useState('')
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [questionLoading, setQuestionLoading] = useState(false)

  const recordIdForAi = savedRecordId || (isUUID(normalizedResultId) ? normalizedResultId : null)
  const aiStorageKey = recordIdForAi || normalizedResultId
  const canEditQuestion = isSaved && isAuthor
  const canAttemptEditQuestion = isLocalResult || canEditQuestion
  const canViewPrivateNotes = isLocalResult || isAuthor

  const handleResetIdempotencyKey = useCallback(() => {
    aiIdempotencyKeyRef.current = null
  }, [])

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

  const persistQuestionUpdate = useCallback(async (nextQuestion: string) => {
    const finalQuestion = (nextQuestion || '').trim() || '诚心求占此事吉凶'

    if (!isSaved || !savedRecordId || !isAuthor) {
      toast({ title: '请先保存到云端', description: '保存后才能修改标题', variant: 'destructive' })
      return
    }

    if (isSaved && savedRecordId && isAuthor) {
      setQuestionLoading(true)
      try {
        const { success, message } = await updateDivinationQuestion(savedRecordId, finalQuestion)
        if (success) {
          toast({ title: '更新成功', description: '所占事项已更新' })
          setIsEditingQuestion(false)
          setHasUnsavedChanges(false)
          setQuestion(finalQuestion)
          setPayload((prev) => (prev ? { ...prev, question: finalQuestion } : prev))
          return
        }
        toast({ title: '更新失败', description: message, variant: 'destructive' })
      } catch {
        toast({ title: '更新失败', variant: 'destructive' })
      } finally {
        setQuestionLoading(false)
      }
      return
    }

    setQuestion(finalQuestion)
    setIsEditingQuestion(false)
    setHasUnsavedChanges(false)
    setPayload((prev) => (prev ? { ...prev, question: finalQuestion } : prev))
  }, [isSaved, savedRecordId, isAuthor, toast])

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
            
            // Fetch notes (component will handle loading, but we need to check for AI note)
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
            router.push('/tools/6yao')
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
            }
            else {
               const legacy = localStorage.getItem('latestDivinationResult')
               if(legacy) {
                 const legacyData = JSON.parse(legacy)
                 if (!legacyData.question) legacyData.question = '诚心求占此事吉凶'
                 setQuestion(legacyData.question)
                 setPayload(legacyData)
                 setIsAuthor(false)
                 setIsSaved(false)
                 setSavedRecordId(null)
                 setHasUnsavedChanges(false)
                 setNotes(loadLocalNotes(resultId))
               }
               else router.push('/tools/6yao')
            }
          } else {
             router.push('/tools/6yao')
          }
        }
      } catch (e) {
        console.error("Failed to load result:", e)
        router.push('/tools/6yao')
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
  }, [payload, saving, isSaved, savedRecordId, resultId, toast, calculatedData, question, hasUnsavedChanges, isLocalResult, handleLoginRedirect])

  const persistAiResult = useCallback(async (result: string) => {
    if (!result.trim()) return;
    if (savedOnceRef.current) return;
    savedOnceRef.current = true;

    const recordId = recordIdForAi;
    if (recordId && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`${AI_RESULT_STORAGE_PREFIX}${recordId}`, result);
      } catch {
      }
    }

    if (recordId && isUUID(recordId)) {
      try {
        const notes = await getDivinationNotes(recordId);
        const aiNote = notes.find((n) => n.content.startsWith(AI_NOTE_PREFIX));
        if (aiNote) {
          await updateDivinationNote(aiNote.id, `${AI_NOTE_PREFIX}\n${result}`);
        } else {
          await addDivinationNote(recordId, `${AI_NOTE_PREFIX}\n${result}`);
        }
      } catch {
      }
    }
    
    // Update state to show as final result
    setAiResult(result);
    setAiResultAt(new Date().toISOString());
  }, [recordIdForAi]);

  const startAiAnalysis = useCallback(async () => {
    if (!calculatedData) {
        console.warn('Cannot analyze: guaData is missing');
        return;
    }

    // Abort previous request if any
    aiAbortControllerRef.current?.abort();
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    savedOnceRef.current = false;
    setAiStreamContent('');
    setAiStreamError(null);
    setIsAiStreaming(true); 

    // Generate idempotency key if not exists
    if (!aiIdempotencyKeyRef.current) {
      aiIdempotencyKeyRef.current = generateIdempotencyKey();
    }

    try {
      // Get session for token
      const session = await getSession();
      const token = session?.access_token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question,
          background: '',
          guaData: calculatedData,
          idempotencyKey: aiIdempotencyKeyRef.current,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        
        // Check if it's a handled error (JSON)
        let isHandledError = false;
        let errorMessage = text;
        try {
           const json = JSON.parse(text);
           if (json.error) {
             isHandledError = true;
             errorMessage = json.error;
           }
        } catch {}

        // If handled error (e.g. 402, 500 with refund), clear key to allow fresh retry
        if (isHandledError) {
           aiIdempotencyKeyRef.current = null;
        }

        throw new Error(errorMessage || `HTTP ${response.status}`);
      }
      
      if (!response.body) throw new Error('Empty response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        accumulatedContent += chunkValue;
        setAiStreamContent(accumulatedContent);
      }

      // Analysis complete
      setIsAiStreaming(false);
      persistAiResult(accumulatedContent);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignore abort
        return;
      }
      console.error('AI Analysis Error:', err);
      setAiStreamError(err);
      setIsAiStreaming(false);
    }
  }, [calculatedData, question, persistAiResult]);

  // 移动端按钮的处理函数，复用组件逻辑
  const handleMobileAiAnalyzeClick = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }

    if (aiResult) {
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
      setShowAiNotOwnerConfirm(true)
      return
    }

    // 显示确认弹窗，而不是直接开始分析
    setShowAiCostConfirm(true)
  }, [
    aiResult,
    isSaved,
    isAuthor,
    toast,
    handleLoginRedirect,
    handleScrollToResult,
    startAiAnalysis,
  ])

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
      startAiAnalysis()
      setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } finally {
      setAiBalanceChecking(false)
    }
  }

  const handleQuestionEditClick = useCallback(async () => {
    if (!canAttemptEditQuestion) return
    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }
    if (!isSaved) {
      toast({ title: '请先保存到云端', description: '保存后才能修改标题', variant: 'destructive' })
      return
    }
    if (!isAuthor) return
    setIsEditingQuestion(true)
  }, [canAttemptEditQuestion, isAuthor, isSaved, handleLoginRedirect, toast])

  const handlePublish = async () => {
    let recordIdToUse = savedRecordId || (isUUID(resultId) ? resultId : null)
    if (!isSaved || hasUnsavedChanges) recordIdToUse = await saveRecordToCloud(true)
    if (recordIdToUse) router.push(`/community/publish?tab=divination&recordId=${recordIdToUse}`)
    else toast({ title: '无法发布', description: '无法获取排盘记录ID', variant: 'destructive' })
  }

  const handleShareImage = useCallback(async () => {
    if (!calculatedData || !payload) {
      toast({
        title: '无法生成分享图',
        description: '缺少必要的排盘数据',
        variant: 'destructive',
      })
      return
    }

    // 打开对话框
    setShareDialogOpen(true)
  }, [calculatedData, payload, toast])

  const handleDownloadAndShareImage = useCallback(async () => {
    if (!shareImageRef.current || !calculatedData) return

    setDownloading(true)
    try {
      // 使用 html-to-image 生成图片
      const dataUrl = await toPng(shareImageRef.current, {
        backgroundColor: '#F9F8F4',
        pixelRatio: 2, // 2倍图，提高清晰度
        cacheBust: true,
      })

      // 将 data URL 转换为 Blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `易知六爻_${question.slice(0, 10) || '六爻'}_${new Date().toISOString().split('T')[0]}.png`, {
        type: 'image/png',
      })

      // 尝试使用 Web Share API 分享图片
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: '六爻排盘结果',
            text: `我正在查看排盘结果：${calculatedData.originalFullInfo.fullName} ${calculatedData.hasMovingLines ? `之 ${calculatedData.changedFullInfo.fullName}` : ''}`,
            files: [file],
          })
          toast({ title: '分享成功', description: '图片已分享' })
          setShareDialogOpen(false)
          return
        } catch (shareError: any) {
          // 如果分享失败（用户取消等），继续执行下载逻辑
          if (shareError.name !== 'AbortError') {
            console.error('Share failed:', shareError)
          }
        }
      }

      // 如果不支持分享文件，则下载图片
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `易知六爻_${question.slice(0, 10) || '六爻'}_${new Date().toISOString().split('T')[0]}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: '下载成功',
        description: '分享图已保存到本地',
      })
      setShareDialogOpen(false)
    } catch (error) {
      console.error('Failed to generate share image:', error)
      toast({
        title: '生成失败',
        description: '生成图片时出错，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }, [question, calculatedData, toast])


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
                                if (isSaved && e.target.value !== (payload?.question || '诚心求占此事吉凶')) {
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
                                  await persistQuestionUpdate(question)
                                } else if (e.key === 'Escape') {
                                  setQuestion(payload?.question || '诚心求占此事吉凶')
                                  setIsEditingQuestion(false)
                                  setHasUnsavedChanges(false)
                                }
                              }}
                            />
                            {question !== (payload?.question || '诚心求占此事吉凶') && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  onClick={() => {
                                    setQuestion(payload?.question || '诚心求占此事吉凶')
                                    setIsEditingQuestion(false)
                                    setHasUnsavedChanges(false)
                                  }}
                                  variant="ghost"
                                  size="icon-sm"
                                  className="p-1 text-stone-400 hover:text-stone-600"
                                  disabled={questionLoading}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={async () => {
                                    await persistQuestionUpdate(question)
                                  }}
                                  variant="ghost"
                                  size="icon-sm"
                                  className="p-1 text-green-600 hover:text-green-700"
                                  disabled={questionLoading}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span 
                            onClick={handleQuestionEditClick} 
                            className={canAttemptEditQuestion ? "cursor-pointer hover:text-[#C82E31]/80 transition-colors border-b border-transparent hover:border-stone-200" : ""}
                            title={canAttemptEditQuestion ? "点击修改所占事项" : ""}
                          >
                            {question}
                          </span>
                        )}
                      </h1>
                      {canAttemptEditQuestion && !isEditingQuestion && (
                        <Button 
                          onClick={handleQuestionEditClick}
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
                       
                       <Button 
                         onClick={() => setShowShenSha(!showShenSha)} 
                         variant="ghost"
                         size="sm"
                         className="flex items-center gap-1 text-[10px] sm:text-xs text-stone-400 hover:text-[#C82E31] w-fit mt-1 group h-auto py-0.5"
                       >
                          <span className="border-b border-dashed border-stone-300 group-hover:border-[#C82E31] pb-0.5">{showShenSha ? '收起神煞' : '查看神煞互参'}</span>
                          {showShenSha ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                       </Button>
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
                        {originalNature.nature}
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
                           {changedNature.nature}
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

                {(aiResult || isAiStreaming || aiStreamError) && (
                <div ref={aiSectionRef} className="mb-8 bg-white border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm scroll-mt-20">
                   <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-[#C82E31]" />
                      <h4 className="font-serif font-bold text-stone-800 text-base lg:text-lg tracking-wide">
                        AI 分析结果
                      </h4>
                      {isAiStreaming && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
                      {!isAiStreaming && aiResultAt && <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{formatDateTime(aiResultAt)}</span>}
                   </div>
                   
                   {aiStreamError ? (
                     <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm mb-4">
                       分析出错: {aiStreamError.message}
                       <Button variant="outline" size="sm" onClick={startAiAnalysis} className="ml-4 border-red-200 hover:bg-red-100">重试</Button>
                      </div>
                   ) : (
                     <div className="prose prose-stone max-w-none font-serif text-stone-800 prose-headings:text-[#C82E31] prose-strong:text-[#C82E31]">
                       <ReactMarkdown>{isAiStreaming ? aiStreamContent : aiResult}</ReactMarkdown>
                     </div>
                   )}

                   {!isAiStreaming && aiResult && (
                   <div className="flex justify-end pt-4">
                      <Button 
                        variant="outline" 
                        className="gap-2 text-[#C82E31] border-[#C82E31]/30 hover:bg-red-50" 
                        onClick={() => {
                          handleResetIdempotencyKey()
                          startAiAnalysis()
                          handleScrollToResult()
                        }}
                      >
                       <RefreshCw className="w-4 h-4" /> 重新分析
                     </Button>
                   </div>
                   )}
                </div>
                )}

                {/* 5. 私密笔记 */}
                <PrivateNotesSection
                  recordId={savedRecordId || (isUUID(normalizedResultId) ? normalizedResultId : resultId)}
                  isSaved={isSaved}
                  canView={canViewPrivateNotes}
                  aiNotePrefix={AI_NOTE_PREFIX}
                  localStoragePrefix={LOCAL_NOTES_STORAGE_PREFIX}
                  onLoginRedirect={handleLoginRedirect}
                  onNotesChange={setNotes}
                  ref={noteSectionRef}
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
              {/* PC端底部装饰纹理 */}
              <div className="hidden lg:block h-2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </Card>
          </div>

          {/* 右侧工具栏 (桌面端保持不变) */}
          <div className="hidden lg:flex w-72 flex-col gap-4 shrink-0">
             <AiAnalysisCard
               aiResult={aiResult}
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
              loading={questionLoading}
              isAuthor={isAuthor}
              isLocalResult={isLocalResult}
              onSave={() => saveRecordToCloud(true)}
              onPublish={handlePublish}
              onWriteNote={() => noteSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              liuyaoData={calculatedData ? {
                question: question,
                dateISO: payload.divinationTimeISO,
                lunarDate: getLunarDateStringWithoutYear(date),
                kongWang: kongWang,
                benGua: {
                  name: originalFullInfo.fullName || '',
                  element: originalNature.element,
                  key: payload.result.originalKey
                },
                bianGua: hasMovingLines ? {
                  name: changedFullInfo.fullName || '',
                  element: changedNature.element,
                  key: payload.result.changedKey
                } : undefined,
                lines: lineDetails.map((detail, index) => {
                  const position = 6 - index // 从下往上：1-6
                  const isMoving = payload.changingFlags[index] || false
                  const lineValue = payload.lines[index] || ''
                  // 判断阴阳：'-----' 或 '---X---' 为阴(0)，其他为阳(1)
                  const yinYang: 0 | 1 = (lineValue === '-----' || lineValue === '---X---') ? 0 : 1
                  return {
                    position,
                    yinYang,
                    moving: isMoving,
                    detail
                  }
                }),
                // fuShenMap: fuShenMap as Record<number, string> | undefined
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
                 <Button variant="outline" className="w-full border-stone-200 bg-[#fdfbf7] text-stone-500 hover:text-stone-800 hover:bg-white gap-2 h-9 text-xs" onClick={() => router.push('/tools/6yao')}>
                   <RotateCcw className="w-3.5 h-3.5" /> 重新排盘
                 </Button>
               </div>
            </div>
        </div>

          {/* 移动端底部固定工具栏 */}
          <MobileResultActionsBar
            reroutePath="/tools/6yao"
            isSaved={isSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            saving={saving}
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
      {calculatedData && payload && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="paper-texture bg-[#FAF9F6] max-w-[95vw] max-h-[95vh]">
            <DialogHeader>
              <DialogTitle>分享结果图</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <ScrollArea className="w-full max-h-[80vh] overflow-y-auto">
                <div ref={shareImageRef} className="w-full flex justify-center">
                  <LiuyaoShareCard
                    question={question}
                    dateISO={payload.divinationTimeISO}
                    lunarDate={getLunarDateStringWithoutYear(date)}
                    kongWang={kongWang}
                    benGua={{
                      name: originalFullInfo.fullName || '',
                      element: originalNature.element,
                      key: payload.result.originalKey
                    }}
                    bianGua={hasMovingLines ? {
                      name: changedFullInfo.fullName || '',
                      element: changedNature.element,
                      key: payload.result.changedKey
                    } : undefined}
                    lines={lineDetails.map((detail, index) => {
                      const position = 6 - index // 从下往上：1-6
                      const isMoving = payload.changingFlags[index] || false
                      const lineValue = payload.lines[index] || ''
                      // 判断阴阳：'-----' 或 '---X---' 为阴(0)，其他为阳(1)
                      const yinYang: 0 | 1 = (lineValue === '-----' || lineValue === '---X---') ? 0 : 1
                      return {
                        position,
                        yinYang,
                        moving: isMoving,
                        detail
                      }
                    })}
                    aiResult={aiResult}
                  />
                </div>
              </ScrollArea>
              <Button
                onClick={handleDownloadAndShareImage}
                disabled={downloading}
                className="w-full bg-[#C82E31] hover:bg-[#A61B1F] text-white mt-4"
              >
                {downloading ? '生成中...' : '生成并分享图片'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI 分析确认弹窗 */}
      <Dialog open={showAiCostConfirm} onOpenChange={setShowAiCostConfirm}>
        <DialogContent className="bg-white rounded-xl">
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-500 fill-current" />
            </div>
            <DialogTitle className="mb-2">确认 AI 分析</DialogTitle>
            <DialogDescription>
              本次操作将扣除{" "}
              <span className="font-bold text-[#C82E31] text-base">50</span>{" "}
              易币
              <br />
              用于调用大模型进行深度推理。
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


const IconAISparkle = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    style={{ filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))' }} // 增加图标自发光
  >
    {/* 字母 A */}
    <path 
      d="M3.5 20L8.5 6L13.5 20" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* 字母 I */}
    <path 
      d="M18.5 6V20" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    
    {/* 中间的星光 (实心填充，更明显) */}
    <path 
      d="M8.5 13.5L9.5 11.5L11.5 11L9.5 10.5L8.5 8.5L7.5 10.5L5.5 11L7.5 11.5L8.5 13.5Z" 
      fill="currentColor" 
      stroke="none"
    />
  </svg>
)

export default function ResultPage() {
  return (
    <ToastProviderWrapper>
      <ResultPageContent />
    </ToastProviderWrapper>
  )
}
