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
  Loader2,
  Moon,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw, Save, Send,
  Share2, Sparkles,
  Sun,
  Trash2,
  X
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { ToastProviderWrapper } from '@/lib/components/ToastProviderWrapper'
import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Textarea } from '@/lib/components/ui/textarea'
import {
  LINE_LABELS,
  RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId
} from '@/lib/constants/divination'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser, getSession } from '@/lib/services/auth'
import { getUserGrowth } from '@/lib/services/growth'
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
import { calculateChangedLineDetails, calculateLineDetails, getExtendedShenSha, getFuShenAndGuaShen, getHexagramFullInfo, getHexagramNature } from '@/lib/utils/liuyaoDetails'
import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateStringWithoutYear } from '@/lib/utils/lunar'
import { solarTermTextFrom } from '@/lib/utils/solarTerms'
import { HexagramLine } from '../components/HexagramLine'
import { ShenShaList } from '../components/ShenShaList'

const GLOBAL_STYLES = `
  .font-serif-sc { font-family: "Noto Serif SC", "Songti SC", serif; }
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

const saveLocalNotes = (resultId: string, notes: DivinationNote[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${LOCAL_NOTES_STORAGE_PREFIX}${resultId}`, JSON.stringify(notes))
  } catch (e) {
    console.error("Failed to save local notes:", e)
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
    const currentPath = `/6yao/${resultId}`
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
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false)
  const [showAiSaveConfirm, setShowAiSaveConfirm] = useState(false)
  const [showAiNotOwnerConfirm, setShowAiNotOwnerConfirm] = useState(false)
  const [showAiCostConfirm, setShowAiCostConfirm] = useState(false)
  const [aiBalanceChecking, setAiBalanceChecking] = useState(false)
  const [pendingSaveAction, setPendingSaveAction] = useState<'ai' | 'note' | 'title' | null>(null)
  const [forceAiAnalyze, setForceAiAnalyze] = useState(false)
  
  // AI Streaming state
  const [aiStreamContent, setAiStreamContent] = useState('')
  const [isAiStreaming, setIsAiStreaming] = useState(false)
  const [aiStreamError, setAiStreamError] = useState<Error | null>(null)
  const aiAbortControllerRef = useRef<AbortController | null>(null)
  const aiIdempotencyKeyRef = useRef<string | null>(null)
  const aiSectionRef = useRef<HTMLDivElement>(null)
  const savedOnceRef = useRef(false)
  const noteSectionRef = useRef<HTMLDivElement>(null)
  
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
  const canEditQuestion = isSaved && isAuthor
  const canAttemptEditQuestion = isLocalResult || canEditQuestion
  const canViewPrivateNotes = isLocalResult || isAuthor

  const handleConfirmReanalyze = () => {
    setShowReanalyzeConfirm(false)
    aiIdempotencyKeyRef.current = null; // Force new analysis
    startAiAnalysis();
    setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

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
        setIsAuthor(true)
        setSavedRecordId(res.recordId || null)
        setHasUnsavedChanges(false)
        if (showToast) toast({ title: '保存成功' })
        const newRecordId = res.recordId
        if (newRecordId && isLocalResult) {
          const localNotes = notes.filter((n) => !n.content.startsWith(AI_NOTE_PREFIX))
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
  }, [payload, saving, isSaved, savedRecordId, resultId, toast, calculatedData, question, hasUnsavedChanges, isLocalResult, notes, handleLoginRedirect])

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
    setForceAiAnalyze(false); 

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
      setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
  }, [aiResult, isAuthor, isSaved, toast])

  const handleQuestionEditClick = useCallback(async () => {
    if (!canAttemptEditQuestion) return
    const user = await getCurrentUser()
    if (!user) {
      handleLoginRedirect()
      return
    }
    if (!isSaved) {
      setPendingSaveAction('title')
      setShowAiSaveConfirm(true)
      return
    }
    if (!isAuthor) return
    setIsEditingQuestion(true)
  }, [canAttemptEditQuestion, isAuthor, isSaved, toast])

  const handleConfirmSaveForAi = async () => {
    const action = pendingSaveAction
    setShowAiSaveConfirm(false)
    setPendingSaveAction(null)

    const recordId = await saveRecordToCloud(false)
    if (!recordId) {
      toast({ title: '保存失败', variant: 'destructive' })
      return
    }

    if (action === 'ai') {
      toast({ title: '已保存到云端', description: '请再次点击 AI 分析开始推演' })
      return
    }
    if (action === 'title') {
      toast({ title: '已保存到云端', description: '现在可以修改标题' })
      setIsEditingQuestion(true)
      return
    }
    if (action === 'note') {
      toast({ title: '已保存到云端', description: '现在可以添加笔记' })
      return
    }
    toast({ title: '已保存到云端' })
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

  const handlePublish = async () => {
    let recordIdToUse = savedRecordId || (isUUID(resultId) ? resultId : null)
    if (!isSaved || hasUnsavedChanges) recordIdToUse = await saveRecordToCloud(true)
    if (recordIdToUse) router.push(`/community/publish?tab=divination&recordId=${recordIdToUse}`)
    else toast({ title: '无法发布', description: '无法获取排盘记录ID', variant: 'destructive' })
  }

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    
    // 如果是本地结果，直接保存到本地，不需要登录
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

    // 如果是本地笔记或未保存到云端，直接更新本地
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

    // 如果是本地笔记或未保存到云端，直接删除本地
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
                                    await persistQuestionUpdate(question)
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
                            onClick={handleQuestionEditClick} 
                            className={canAttemptEditQuestion ? "cursor-pointer hover:text-[#C82E31]/80 transition-colors border-b border-transparent hover:border-stone-200" : ""}
                            title={canAttemptEditQuestion ? "点击修改所占事项" : ""}
                          >
                            {question}
                          </span>
                        )}
                      </h1>
                      {canAttemptEditQuestion && !isEditingQuestion && (
                        <button 
                          onClick={handleQuestionEditClick}
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
                      <Button variant="outline" className="gap-2 text-[#C82E31] border-[#C82E31]/30 hover:bg-red-50" onClick={() => setShowReanalyzeConfirm(true)}>
                       <RefreshCw className="w-4 h-4" /> 重新分析
                     </Button>
                   </div>
                   )}
                </div>
                )}

                {/* 5. 私密笔记 */}
                {canViewPrivateNotes && (
                <div ref={noteSectionRef} className="mb-8 bg-white border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm scroll-mt-20">
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
                                      disabled={noteLoading}
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
                                     disabled={noteLoading}
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
             <Card className="border-none shadow-md overflow-hidden relative group cursor-pointer bg-linear-to-br from-[#C82E31] to-[#A61B1F]">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-16 h-16 text-white" /></div>
               <div className="relative p-6 text-white">
                 <div className="flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5" /><h3 className="font-bold font-serif text-lg">AI 智能详批</h3></div>
                 <p className="text-red-100 text-xs mb-4 leading-relaxed opacity-90">基于《增删卜易》古法，结合大模型深度推理，为您解析吉凶应期。</p>
                 <Button onClick={handleAiAnalyzeClick} className="w-full bg-white text-[#C82E31] hover:bg-red-50 border-none font-bold shadow-sm h-9 text-xs">开始分析</Button>
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
                 {(isAuthor || isLocalResult) && (
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

          {/* 移动端底部固定工具栏 */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
             <div className="flex items-center gap-4 flex-1 justify-between pr-4">
               <button onClick={() => router.push('/6yao')} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[10px] font-medium">重排</span>
               </button>
               <button 
                 onClick={() => saveRecordToCloud(true)} 
                 className={`flex flex-col items-center gap-0.5 active:scale-95 transition-transform ${isSaved && !hasUnsavedChanges ? 'text-green-600' : 'text-stone-500'}`}
                 disabled={saving}
               >
                  <Save className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{isSaved && !hasUnsavedChanges ? '已存' : '保存'}</span>
               </button>
               {canViewPrivateNotes && (
                 <button 
                   onClick={() => noteSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                   className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform"
                 >
                   <BookOpen className="w-5 h-5" />
                   <span className="text-[10px] font-medium">笔记</span>
                 </button>
               )}
               {(isAuthor || isLocalResult) && (
                 <button onClick={handlePublish} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform" disabled={saving}>
                   <Send className="w-5 h-5" />
                   <span className="text-[10px] font-medium">发布</span>
                 </button>
               )}
               <button 
                 onClick={() => {
                   if (navigator.share) {
                     navigator.share({
                       title: '六爻排盘结果',
                       text: `我正在查看排盘结果：${originalFullInfo.fullName} ${hasMovingLines ? `之 ${changedFullInfo.fullName}` : ''}`,
                       url: window.location.href,
                     }).catch(() => {})
                   } else {
                     navigator.clipboard.writeText(window.location.href)
                     toast({ title: '链接已复制', description: '请粘贴分享给好友' })
                   }
                 }} 
                 className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform"
               >
                 <Share2 className="w-5 h-5" />
                 <span className="text-[10px] font-medium">分享</span>
               </button>
             </div>

             <Button 
               onClick={handleAiAnalyzeClick} 
               className="shrink-0 rounded-full bg-gradient-to-r from-[#C82E31] to-[#D94F4F] hover:from-[#A61B1F] hover:to-[#C82E31] text-white shadow-lg shadow-red-900/20 h-10 w-10 p-0 border-none flex items-center justify-center"
               title="AI 智能详批"
             >
               <Sparkles className="w-5 h-5" />
             </Button>
          </div>
        </div>
          <Dialog open={showAiSaveConfirm} onOpenChange={setShowAiSaveConfirm}>
            <DialogContent className="bg-white rounded-xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>需要先保存到云端</DialogTitle>
                <DialogDescription>
                  使用该功能前，需要先将本次排盘保存到云端。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowAiSaveConfirm(false)} disabled={saving} className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-50">取消</Button>
                <Button onClick={handleConfirmSaveForAi} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full shadow-md shadow-red-900/10" disabled={saving}>
                  保存到云端
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showAiNotOwnerConfirm} onOpenChange={setShowAiNotOwnerConfirm}>
            <DialogContent className="bg-white rounded-xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>提示</DialogTitle>
                <DialogDescription>
                  你不是该排盘作者，AI 分析结果不会保存到该排盘记录，仅会在当前设备缓存。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowAiNotOwnerConfirm(false)} className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-50">取消</Button>
                <Button onClick={handleConfirmAiNotOwner} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full shadow-md shadow-red-900/10">
                  继续分析
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showAiCostConfirm} onOpenChange={setShowAiCostConfirm}>
            <DialogContent className="bg-white rounded-xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>确认 AI 分析</DialogTitle>
                <DialogDescription>
                  本次操作将扣除 50 易币，用于 AI 智能详批。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowAiCostConfirm(false)} disabled={aiBalanceChecking} className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-50">取消</Button>
                <Button onClick={handleConfirmAiAnalyze} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full shadow-md shadow-red-900/10" disabled={aiBalanceChecking}>
                  继续分析
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showReanalyzeConfirm} onOpenChange={setShowReanalyzeConfirm}>
            <DialogContent className="bg-white rounded-xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>确认重新分析</DialogTitle>
                <DialogDescription>
                  本次操作将扣除 50 易币，重新分析的结果会覆盖之前的 AI 分析结果。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowReanalyzeConfirm(false)} className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-50">取消</Button>
                <Button onClick={handleConfirmReanalyze} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full shadow-md shadow-red-900/10">
                  继续分析
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
