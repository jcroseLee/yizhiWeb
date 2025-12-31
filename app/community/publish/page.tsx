'use client'

import RichTextEditor from '@/lib/components/RichTextEditor'
import TagPanel from '@/lib/components/TagPanel'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { createPost, getPost, getPostTags, publishDraft, saveDraft, setPostTags, updateDraft, updatePost, uploadPostCover, type DivinationMethodType, type Tag } from '@/lib/services/community'
import { getDivinationRecordById, getUserDivinationRecords, type DivinationRecord as ProfileDivinationRecord } from '@/lib/services/profile'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDashed,
  Coins,
  FileText,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  PenTool,
  Save,
  ScrollText,
  Send,
  Sparkles,
  X
} from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

// -----------------------------------------------------------------------------
// 样式定义
// -----------------------------------------------------------------------------
const styles = `
  .input-clean {
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
  }
  .input-clean:focus {
    box-shadow: none;
    outline: none;
  }
  
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e7e5e4; border-radius: 20px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d6d3d1; }

  /* 核心修复：强制编辑器高度自适应（写文章模式） */
  .rich-text-content {
    min-height: 50vh !important;
    height: auto !important;
    overflow: visible !important;
    border: none !important;
  }

  /* 移动端工具栏调整 */
  .rich-text-content > div:first-child {
    position: sticky !important;
    top: 56px !important; /* 移动端 Navbar 高度通常稍小 */
    z-index: 30 !important;
    background-color: rgba(255, 255, 255, 0.98) !important;
    border-bottom: 1px solid #e7e5e4 !important;
    margin: 0 !important;
    padding: 8px 4px !important;
    overflow-x: auto !important; /* 允许工具栏横向滚动 */
  }
  
  @media (min-width: 1024px) {
    .rich-text-content > div:first-child {
      top: 64px !important;
    }
  }

  .rich-text-content > div:last-child {
    min-height: 50vh !important;
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
  }

  .rich-text-content .ProseMirror {
    min-height: 50vh !important;
    height: auto !important; 
    overflow: visible !important;
    outline: none !important;
    padding-bottom: 200px !important;
  }
  
  .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
    color: #a8a29e;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`

// -----------------------------------------------------------------------------
// 类型与工具 (保持不变)
// -----------------------------------------------------------------------------
const getMethodName = (method: number): string => {
  const methodMap: Record<number, string> = {
    1: '金钱课', 2: '时间起卦', 3: '报数起卦', 4: '意念起卦',
  }
  return methodMap[method] || '未知方法'
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch {
    return dateString
  }
}

interface RecordDisplay {
  id: string
  title?: string
  gua: string
  date: string
  method: string
  record: DivinationRecordLite
}

type DivinationRecordLite = Omit<Pick<ProfileDivinationRecord, 'id' | 'question' | 'divination_time' | 'method' | 'original_key'>, 'question'> & { question?: string | null }

const convertRecordToDisplay = (record: DivinationRecordLite): RecordDisplay => {
  const originalKey = String(record.original_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
  const hexagram = getHexagramResult(originalKey)
  const guaName = hexagram.name || '未知卦'
  
  return {
    id: record.id,
    title: record.question || undefined,
    gua: guaName,
    date: formatDate(record.divination_time),
    method: getMethodName(record.method),
    record,
  }
}


// -----------------------------------------------------------------------------
// 子组件：排盘卡片
// -----------------------------------------------------------------------------
const RecordCard = ({ data, onClick, isSelected = false, compact = false }: { data: RecordDisplay, onClick?: () => void, isSelected?: boolean, compact?: boolean }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative group border transition-all duration-200 rounded-xl cursor-pointer overflow-hidden ${isSelected ? 'bg-red-50/50 border-[#C82E31] ring-1 ring-[#C82E31]/20' : 'bg-white border-stone-200 hover:border-[#C82E31]/50 hover:shadow-sm hover:-translate-y-0.5'} ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="absolute -right-2 -bottom-4 text-[4rem] font-serif text-stone-50 opacity-50 select-none pointer-events-none group-hover:text-red-50/50 transition-colors">卦</div>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isSelected ? 'bg-[#C82E31] text-white border-[#C82E31]' : 'bg-stone-100 text-stone-500 border-stone-200 group-hover:border-red-200 group-hover:text-red-600 group-hover:bg-red-50'}`}>{data.gua}</span>
            <span className="text-[10px] text-stone-400 font-mono">{data.date}</span>
          </div>
          <h4 className={`font-serif font-bold truncate ${compact ? 'text-sm' : 'text-base'} text-stone-800 group-hover:text-[#C82E31] transition-colors`}>{data.title || '无标题求测'}</h4>
          <div className="mt-2 flex items-center text-xs text-stone-400 gap-2">
            <span className="flex items-center gap-1"><ScrollText className="w-3 h-3" /> {data.gua}</span>
          </div>
        </div>
        {isSelected ? (
          <div className="w-6 h-6 rounded-full bg-[#C82E31] text-white flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in duration-200"><Check className="w-3.5 h-3.5" /></div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-stone-200 text-transparent group-hover:border-red-200 group-hover:bg-red-50 flex items-center justify-center shrink-0"><ChevronRight className="w-3.5 h-3.5 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------
function PublishPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const tabParam = searchParams.get('tab')
  const recordIdParam = searchParams.get('recordId')
  const postIdParam = searchParams.get('id')
  const initialTab = (tabParam === 'article' ? 'article' : 'divination') as 'divination' | 'article'
  
  const [activeTab, setActiveTab] = useState<'divination' | 'article'>(initialTab)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [bounty, setBounty] = useState(0)
  const [method, setMethod] = useState<DivinationMethodType>('liuyao')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [selectedRecord, setSelectedRecord] = useState<RecordDisplay | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [backgroundDesc, setBackgroundDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<RecordDisplay[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedSubjectTags = selectedTags.filter((t) => t.category === 'subject')
  
  // URL sync
  useEffect(() => {
    if (tabParam === 'article' || tabParam === 'divination') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    if (activeTab === 'divination') setMethod('liuyao')
  }, [activeTab])

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


  // Data Loading
  const loadHistoryRecords = useCallback(async () => {
    setLoadingRecords(true)
    try {
      const records = await getUserDivinationRecords(50)
      const displayRecords = records.map(convertRecordToDisplay)
      setHistoryRecords(displayRecords)
    } catch (error) {
      console.error(error)
      toast({ title: '加载失败', variant: 'destructive' })
    } finally {
      setLoadingRecords(false)
    }
  }, [toast])
  
  useEffect(() => {
    const loadData = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }
      await loadHistoryRecords()
      
      if (recordIdParam) {
        try {
          const record = await getDivinationRecordById(recordIdParam, true)
          if (record) {
            const displayRecord = convertRecordToDisplay(record)
            setSelectedRecord(displayRecord)
            setMethod('liuyao')
            setActiveTab('divination')
            if (record.question) setTitle(record.question)
            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.delete('recordId')
            window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams.toString()}`)
          } else {
            toast({ title: '加载失败', description: '无法加载排盘记录，可能是您没有权限或记录不存在', variant: 'destructive' })
          }
        } catch (error) { console.error(error) }
      }
      
      if (postIdParam) {
        setIsEditMode(true)
        setEditingPostId(postIdParam)
        try {
          const post = await getPost(postIdParam)
          if (post) {
            const currentUser = await getCurrentUser()
            if (post.user_id !== currentUser?.id) {
              toast({ title: '无权限', description: '您只能编辑自己的帖子', variant: 'destructive' })
              router.push('/community')
              return
            }
            setTitle(post.title)
            setBounty(post.bounty || 0)
            setCoverImageUrl(post.cover_image_url || null)
            setIsDraft(post.status === 'draft')
            setMethod((post.method as DivinationMethodType) || (post.divination_record_id ? 'liuyao' : 'general'))
            
            if (post.type === 'help' && post.divination_record) {
              setActiveTab('divination')
              const displayRecord = convertRecordToDisplay(post.divination_record)
              setSelectedRecord(displayRecord)
              const content = post.content_html || post.content || ''
              const cleanedContent = content
                .replace(/<[^>]*>/g, ' ')
                .replace(/\*\*关联排盘[^*]*\*\*/g, '')
                .replace(/\*\*问题[^*]*\*\*/g, '')
                .replace(/关联排盘[:：][^\n]*/g, '')
                .replace(/问题[:：][^\n]*/g, '')
                .trim()
              setBackgroundDesc(cleanedContent || '')
            } else {
              setActiveTab('article')
              setBackgroundDesc(post.content_html || post.content || '')
            }
            try {
              const tags = await getPostTags(postIdParam)
              setSelectedTags(tags)
            } catch {}
            // 保持URL中的ID，以便刷新页面后仍处于编辑模式
            // const newSearchParams = new URLSearchParams(searchParams.toString())
            // newSearchParams.delete('id')
            // window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams.toString()}`)
          } else {
            toast({ title: '加载失败', description: '帖子不存在', variant: 'destructive' })
            router.push('/community')
          }
        } catch (error) {
          console.error(error)
          toast({ title: '加载失败', description: '无法加载帖子数据', variant: 'destructive' })
          router.push('/community')
        }
      }
    }
    loadData()
  }, [router, toast, loadHistoryRecords, recordIdParam, postIdParam, searchParams])
  
  useEffect(() => {
    if (showHistoryModal) loadHistoryRecords()
  }, [showHistoryModal, loadHistoryRecords])
  
  const handleCoverImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast({ title: '不支持的文件类型', description: '请上传图片文件', variant: 'destructive' })
      return
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({ title: '文件过大', description: '文件大小不能超过 10MB', variant: 'destructive' })
      return
    }
    try {
      setUploadingCover(true)
      const url = await uploadPostCover(file)
      if (url) {
        setCoverImageUrl(url)
        toast({ title: '封面图片上传成功' })
      }
    } catch (error) {
      console.error(error)
      toast({ title: '上传失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setUploadingCover(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveCoverImage = () => setCoverImageUrl(null)
  const handleCoverImageClick = () => fileInputRef.current?.click()
  
  const handlePublish = async () => {
    if (!title.trim()) return toast({ title: '请输入标题', variant: 'destructive' })
    if (activeTab === 'divination' && !selectedRecord) return toast({ title: '请选择排盘记录', variant: 'destructive' })
    if (!backgroundDesc.trim()) return toast({ title: '请输入内容', variant: 'destructive' })
    if (selectedTags.length === 0) return toast({ title: '请至少选择一个标签', variant: 'destructive' })
    if (selectedSubjectTags.length === 0) return toast({ title: '请选择求测事类标签', variant: 'destructive' })
    
    try {
      setIsSubmitting(true)
      let content = backgroundDesc
      if (activeTab === 'divination' && selectedRecord) {
        const guaInfo = selectedRecord.record.question 
          ? `**关联排盘：${selectedRecord.gua}**\n**问题：${selectedRecord.record.question}**\n\n${backgroundDesc}`
          : `**关联排盘：${selectedRecord.gua}**\n\n${backgroundDesc}`
        content = guaInfo
      }
      
      const postData = {
        title: title.trim(),
        content: content.trim(),
        type: (activeTab === 'divination' ? 'help' : 'theory') as 'help' | 'theory' | 'debate' | 'chat',
        bounty: bounty > 0 ? bounty : 0,
        divination_record_id: activeTab === 'divination' && selectedRecord ? selectedRecord.record.id : null,
        cover_image_url: coverImageUrl || null,
        method,
      }
      
      let post
      if (isEditMode && editingPostId) {
        if (isDraft) {
          await publishDraft(editingPostId)
          post = await updatePost(editingPostId, postData)
          await setPostTags(editingPostId, selectedTags.map((t) => t.id))
          toast({ title: '发布成功' })
        } else {
          post = await updatePost(editingPostId, postData)
          await setPostTags(editingPostId, selectedTags.map((t) => t.id))
          toast({ title: '更新成功' })
        }
      } else {
        post = await createPost(postData)
        await setPostTags(post.id, selectedTags.map((t) => t.id))
        toast({ title: '发布成功' })
      }
      router.push(`/community/${post.id}`)
    } catch (error) {
      toast({ title: isEditMode ? '更新失败' : '发布失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSaveDraft = async () => {
    if (!title.trim() && !backgroundDesc.trim()) {
      return toast({ title: '请至少填写标题或内容', variant: 'destructive' })
    }
    
    try {
      setIsSavingDraft(true)
      let content = backgroundDesc
      if (activeTab === 'divination' && selectedRecord) {
        const guaInfo = selectedRecord.record.question 
          ? `**关联排盘：${selectedRecord.gua}**\n**问题：${selectedRecord.record.question}**\n\n${backgroundDesc}`
          : `**关联排盘：${selectedRecord.gua}**\n\n${backgroundDesc}`
        content = guaInfo
      }
      
      const draftData = {
        title: title.trim() || '未命名草稿',
        content: content.trim() || '',
        type: (activeTab === 'divination' ? 'help' : 'theory') as 'help' | 'theory' | 'debate' | 'chat',
        bounty: bounty > 0 ? bounty : 0,
        divination_record_id: activeTab === 'divination' && selectedRecord ? selectedRecord.record.id : null,
        cover_image_url: coverImageUrl || null,
        method,
      }
      
      let draft
      if (isEditMode && editingPostId && isDraft) {
        draft = await updateDraft(editingPostId, draftData)
        await setPostTags(editingPostId, selectedTags.map((t) => t.id))
        toast({ title: '草稿已更新' })
      } else {
        draft = await saveDraft(draftData)
        await setPostTags(draft.id, selectedTags.map((t) => t.id))
        toast({ title: '草稿已保存' })
        setIsEditMode(true)
        setEditingPostId(draft.id)
        setIsDraft(true)
      }
    } catch (error) {
      toast({ title: '保存草稿失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setIsSavingDraft(false)
    }
  }

  return (
    <>
      <style jsx global>
        {styles}
      </style>
      <div className="min-h-screen bg-[#f5f5f7] paper-texture font-sans text-stone-800 pb-20">
        
        {/* Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200 h-14 lg:h-16">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="-ml-2 hover:bg-stone-100 h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5 text-stone-600" />
              </Button>
              <h1 className="text-base lg:text-lg font-serif font-bold text-stone-900 truncate max-w-[120px] lg:max-w-none">
                {isEditMode ? '编辑帖子' : '发布内容'}
              </h1>
            </div>
            
            {/* 顶部操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full px-3 lg:px-6 h-8 lg:h-10 text-xs lg:text-sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
              >
                {isSavingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin lg:mr-2" />
                ) : (
                  <Save className="h-3.5 w-3.5 lg:mr-2" />
                )}
                <span className="hidden lg:inline">{isSavingDraft ? '保存中' : '保存草稿'}</span>
                <span className="lg:hidden">{isSavingDraft ? '保存' : '草稿'}</span>
              </Button>
              <Button
                className="bg-[#C82E31] hover:bg-[#b02225] text-white rounded-full px-4 lg:px-6 h-8 lg:h-10 text-xs lg:text-sm shadow-md shadow-red-100 transition-all"
                onClick={handlePublish}
                disabled={isSubmitting || !title.trim() || (activeTab === "divination" && !selectedRecord) || selectedTags.length === 0 || selectedSubjectTags.length === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin lg:mr-2" />
                ) : (
                  <Send className="h-3.5 w-3.5 lg:mr-2" />
                )}
                <span>{isSubmitting ? (isEditMode ? "更新" : "发布") : (isDraft ? "发布" : (isEditMode ? "更新" : "发布"))}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-0 lg:px-8 py-0 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 items-start">
            
            {/* 左侧编辑器区 */}
            <div className="flex-1 w-full min-w-0">
              <Card className="min-h-[85vh] border-none shadow-sm flex flex-col bg-white rounded-none lg:rounded-xl">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) =>
                    setActiveTab(v as "divination" | "article")
                  }
                  className="flex-1 flex flex-col"
                >
                  {/* Tab Header - 恢复 PC 端样式，保留移动端优化 */}
                  <div className="border-b border-stone-100 bg-stone-50/50 lg:bg-stone-50/30 px-4 lg:px-6 pt-3 lg:pt-4 shrink-0">
                    <TabsList className="bg-stone-200/50 lg:bg-stone-100 p-1 h-auto rounded-lg w-full lg:w-auto grid grid-cols-2 lg:inline-flex">
                      <TabsTrigger
                        value="divination"
                        className="py-2 lg:px-6 lg:py-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#C82E31] data-[state=active]:shadow-sm transition-all cursor-pointer text-xs lg:text-sm"
                      >
                        <LayoutGrid className="h-3.5 w-3.5 lg:h-4 lg:w-4 mr-2" /> 排盘求测
                      </TabsTrigger>
                      <TabsTrigger
                        value="article"
                        className="py-2 lg:px-6 lg:py-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#C82E31] data-[state=active]:shadow-sm transition-all cursor-pointer text-xs lg:text-sm"
                      >
                        <FileText className="h-3.5 w-3.5 lg:h-4 lg:w-4 mr-2" /> 撰写文章
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 flex flex-col">
                    
                    {/* Tab 1: 排盘求测 */}
                    <TabsContent
                      value="divination"
                      className="p-4 lg:p-10 flex-1 flex flex-col space-y-6 lg:space-y-8 mt-0 animate-in fade-in duration-300"
                    >
                      <div className="space-y-2">
                        {/* 标题输入 */}
                        <Input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="请输入你想测算的问题..."
                          className="input-clean text-xl lg:text-3xl font-serif font-bold placeholder:text-stone-300 text-stone-900 leading-tight border-0 shadow-none px-0"
                        />
                        <div className="h-px w-full bg-stone-100"></div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold text-stone-700 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#C82E31]" />{" "}
                            关联排盘
                          </Label>
                          {!selectedRecord && (
                            <span className="text-xs text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                              必填
                            </span>
                          )}
                        </div>
                        {!selectedRecord ? (
                          <button
                            onClick={() => setShowHistoryModal(true)}
                            className="w-full h-24 lg:h-28 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-[#C82E31]/50 hover:text-[#C82E31] transition-all flex flex-col items-center justify-center gap-2 lg:gap-3 group cursor-pointer"
                          >
                            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:border-red-200 group-hover:shadow-md transition-all">
                              <History className="h-4 w-4 lg:h-5 lg:w-5 text-stone-400 group-hover:text-[#C82E31]" />
                            </div>
                            <div className="text-center">
                              <span className="text-xs lg:text-sm font-bold block text-stone-600 group-hover:text-[#C82E31]">
                                选择历史排盘记录
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="relative group">
                            <RecordCard data={selectedRecord} />
                            <div className="absolute top-3 right-3 flex gap-2 z-20">
                              <Button
                                variant="secondary"
                                size="sm"
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHistoryModal(true) }}
                                className="h-8 px-3 bg-white/80 backdrop-blur-sm shadow-sm border border-stone-200 text-stone-600 hover:text-[#C82E31] hover:bg-white transition-all text-xs"
                              >
                                更换
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedRecord(null) }}
                                className="h-8 w-8 bg-white/80 backdrop-blur-sm shadow-sm border border-stone-200 text-stone-400 hover:text-red-500 hover:bg-white transition-all"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3 flex-1 flex flex-col min-h-[300px]">
                        <Label className="text-sm font-bold text-stone-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-stone-400" />{" "}
                          背景详情
                        </Label>
                        <div className="rounded-xl border border-stone-200 overflow-hidden focus-within:ring-1 focus-within:ring-[#C82E31] focus-within:border-[#C82E31] transition-all flex-1 flex flex-col">
                          <RichTextEditor
                            content={backgroundDesc}
                            onChange={(content) => setBackgroundDesc(content)}
                            placeholder="请详细描述事情起因、现状以及您最担心的点..."
                            className="w-full h-full flex-1 border-none min-h-[200px]"
                          />
                        </div>
                      </div>
                      
                      {/* 悬赏设置 */}
                      <div className="pt-4 border-t border-stone-100 shrink-0">
                        <div className="bg-linear-to-r from-amber-50 to-orange-50/50 rounded-xl p-1">
                          <div className="bg-white/60 rounded-lg p-3 lg:p-4 flex items-center justify-between backdrop-blur-sm">
                            <div className="flex items-center gap-2 lg:gap-3">
                              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-colors ${bounty > 0 ? "bg-amber-100 text-amber-600 shadow-sm" : "bg-stone-100 text-stone-400"}`}>
                                <Coins className="h-4 w-4 lg:h-5 lg:w-5" />
                              </div>
                              <div>
                                <div className="text-xs lg:text-sm font-bold text-stone-800">悬赏易币</div>
                                <div className="text-[10px] lg:text-xs text-stone-500 hidden sm:block">
                                  {bounty > 0 ? "提高悬赏可加快回复速度" : "设置悬赏吸引更多大师解卦"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center relative">
                              <Input
                                type="number"
                                min="0"
                                value={bounty}
                                onChange={(e) => setBounty(Number(e.target.value))}
                                className="w-20 lg:w-24 pr-8 lg:pr-10 text-right font-bold border-stone-200 focus-visible:ring-amber-500/20 focus-visible:border-amber-500 h-8 lg:h-10 text-sm"
                              />
                              <span className="absolute right-2 lg:right-3 text-xs text-stone-400 font-medium">币</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 标签面板 */}
                      <div className="pt-4 border-t border-stone-100 shrink-0">
                        <div className="bg-gradient-to-r from-stone-50 to-stone-100/50 rounded-xl p-1">
                          <div className="bg-white/60 rounded-lg p-3 lg:p-4 backdrop-blur-sm">
                            <TagPanel
                              method={method}
                              onMethodChange={setMethod}
                              selectedTags={selectedTags}
                              onTagsChange={setSelectedTags}
                              methodLocked={true}
                              title={title}
                              backgroundDesc={backgroundDesc}
                              required={true}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 2: 撰写文章 */}
                    <TabsContent
                      value="article"
                      className="flex-1 flex flex-col mt-0 animate-in fade-in duration-300 h-auto"
                    >
                      {/* 头部信息 */}
                      <div className="px-4 lg:px-10 pt-6 pb-4 space-y-6 border-y border-stone-100 backdrop-blur-sm">
                        {/* 封面图片 */}
                        <div className="space-y-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleCoverImageSelect}
                            className="hidden"
                            disabled={uploadingCover}
                          />
                          {coverImageUrl ? (
                            <div className="relative group">
                              <div 
                                onClick={handleCoverImageClick}
                                className="relative w-full h-40 lg:h-48 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group-hover:border-[#C82E31]/50 transition-all cursor-pointer"
                              >
                                <Image
                                  src={coverImageUrl}
                                  alt="文章封面"
                                  fill
                                  className="object-cover group-hover:opacity-90 transition-opacity pointer-events-none"
                                  sizes="(max-width: 768px) 100vw, 100%"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white text-sm font-medium">
                                    <ImageIcon className="h-4 w-4" />
                                    <span>点击更换封面</span>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveCoverImage() }}
                                  className="absolute top-2 right-2 h-7 w-7 lg:h-8 lg:w-8 bg-black/50 hover:bg-black/70 text-white border-none shadow-lg z-10"
                                >
                                  <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={uploadingCover}
                              onClick={handleCoverImageClick}
                              className="w-full h-24 lg:h-32 bg-stone-50 border-2 border-dashed border-stone-200 hover:border-[#C82E31]/30 hover:bg-stone-50 text-stone-400 hover:text-[#C82E31] transition-all rounded-xl shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {uploadingCover ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
                                  <span className="text-xs lg:text-sm font-medium">上传中...</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                                  <span className="text-xs lg:text-sm font-medium">添加文章封面</span>
                                </div>
                              )}
                            </Button>
                          )}
                        </div>
                        <Input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="请输入文章标题"
                          className="input-clean text-2xl lg:text-4xl font-serif font-bold placeholder:text-stone-300 text-stone-900 leading-tight px-0 py-2 shrink-0"
                        />
                      </div>

                      {/* 编辑器区域 */}
                      <div className="px-4 lg:px-10 py-6 flex-1 bg-white">
                        <RichTextEditor
                          content={backgroundDesc}
                          onChange={(content) => setBackgroundDesc(content)}
                          placeholder="开始撰写您的正文... 支持 Markdown 语法"
                          className="w-full h-auto border-none focus-within:ring-0 text-base lg:text-lg leading-relaxed text-stone-800 rich-text-content"
                        />
                      </div>

                      {/* 标签面板 */}
                      <div className="px-4 lg:px-10 pt-4 pb-6 border-t border-stone-100 shrink-0">
                        <div className="bg-gradient-to-r from-stone-50 to-stone-100/50 rounded-xl p-1">
                          <div className="bg-white/60 rounded-lg p-3 lg:p-4 backdrop-blur-sm">
                            <TagPanel
                              method={method}
                              onMethodChange={setMethod}
                              selectedTags={selectedTags}
                              onTagsChange={setSelectedTags}
                              methodLocked={false}
                              title={title}
                              backgroundDesc={backgroundDesc}
                              required={true}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>
            </div>

            {/* 右侧助手 (移动端隐藏) */}
            <aside className="hidden lg:block w-80 shrink-0 space-y-6 sticky top-24">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-stone-200 to-stone-300"></div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-stone-800 flex items-center p-2 gap-2">
                    <PenTool className="h-4 w-4 text-[#C82E31]" />{" "}
                    {activeTab === "divination" ? "求测指南" : "写作助手"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-stone-500 space-y-4">
                  {activeTab === "divination" ? (
                    <>
                      <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                        <p className="leading-relaxed">描述越清晰，断卦越准确。建议包含：</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1 text-stone-400">
                          <li>起卦的初衷</li>
                          <li>当前遇到的具体困难</li>
                          <li>希望得到的指引方向</li>
                        </ul>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800">
                        <p className="font-bold mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> 关于悬赏
                        </p>
                        <p className="opacity-80">悬赏贴通常能在 1 小时内获得高质量回复。</p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                        <p className="font-bold text-stone-700 mb-2">优质文章标准：</p>
                        <ul className="space-y-2">
                          <li className="flex gap-2"><Check className="w-3 h-3 text-green-500 mt-0.5" /> 标题简明扼要</li>
                          <li className="flex gap-2"><Check className="w-3 h-3 text-green-500 mt-0.5" /> 结构清晰，分段合理</li>
                          <li className="flex gap-2"><Check className="w-3 h-3 text-green-500 mt-0.5" /> 引用古籍请注明出处</li>
                        </ul>
                      </div>
                      <p className="text-stone-400 pl-1 gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-type inline w-3 h-3 mr-1" aria-hidden="true"><path d="M12 4v16"></path><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"></path><path d="M9 20h6"></path></svg>
                        排版清晰的文章更容易获得“精选”推荐，展示在首页显眼位置。
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>

        {/* 历史排盘弹窗 - 移动端全屏模式优化 */}
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="max-w-2xl w-[95vw] lg:w-full bg-white p-0 gap-0 overflow-hidden border-none shadow-xl rounded-xl">
            <DialogHeader className="px-4 lg:px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base lg:text-lg font-serif font-bold text-stone-900">
                    选择排盘记录
                  </DialogTitle>
                  <DialogDescription className="text-xs text-stone-500 mt-1">
                    从您的历史记录中选择一条进行发布
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] lg:max-h-[500px] overflow-y-auto custom-scrollbar bg-[#FAFAF9] p-3 lg:p-4 min-h-[300px]">
              {loadingRecords ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C82E31]" />
                  <span className="text-sm text-stone-400">
                    正在读取天机...
                  </span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-stone-500">
                  <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                    <CircleDashed className="h-8 w-8 text-stone-300" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">暂无排盘记录</p>
                    <p className="text-xs mt-1 text-stone-400">
                      请先使用排盘工具起卦
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/6yao")}
                    className="mt-2 border-[#C82E31] text-[#C82E31] hover:bg-red-50"
                  >
                    去排盘
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {historyRecords.map((record) => (
                    <RecordCard
                      key={record.id}
                      data={record}
                      compact={true}
                      isSelected={selectedRecord?.id === record.id}
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowHistoryModal(false);
                        if (record.title && !title) setTitle(record.title);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 lg:px-6 py-3 border-t border-stone-100 bg-white flex justify-between items-center text-xs text-stone-500">
              <span>共 {historyRecords.length} 条记录</span>
              <Button
                variant="link"
                className="text-[#C82E31] h-auto p-0 hover:no-underline flex items-center gap-1"
                onClick={() => router.push("/6yao")}
              >
                新建排盘 <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function PublishPageSimple() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-stone-200 border-t-[#C82E31] rounded-full animate-spin" />
          <p className="text-stone-500">加载中...</p>
        </div>
      </div>
    }>
      <PublishPageContent />
    </Suspense>
  )
}
