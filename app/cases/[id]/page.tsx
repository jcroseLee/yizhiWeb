'use client'

import DOMPurify from 'isomorphic-dompurify'

import { Bookmark, CheckCircle2, Loader2, Printer, ThumbsUp, Undo2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import CaseDetailSkeleton from '@/app/cases/components/CaseDetailSkeleton'
import BaZiPanelDual from '@/app/community/components/BaZiPanelDual'
import GuaPanelDual from '@/app/community/components/GuaPanelDual'
import { getBaziInfo } from '@/app/community/components/PostCard'
import DetailPageHeader from '@/lib/components/DetailPageHeader'
import Divider from '@/lib/components/Divider'
import UserHoverCard from '@/lib/components/UserHoverCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser, getSession } from '@/lib/services/auth'
import { calculateLevel, getTitleName } from '@/lib/services/growth'
import { getUserProfileById, getUserStats, isFollowingUser, toggleFollowUser } from '@/lib/services/profile'
import { convertDivinationRecordToFullGuaData } from '@/lib/utils/divinationToFullGuaData'

function sanitizeHtml(dirty: string) {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty)
}

type Accuracy = 'accurate' | 'inaccurate' | 'partial'

function stripHtmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim()
}

type ApiDetail = {
  post: {
    id: string
    user_id: string
    title: string
    content: string
    content_html: string | null
    view_count: number
    like_count: number
    comment_count: number
    created_at: string
    profiles?: { id: string; nickname: string | null; avatar_url: string | null } | null
    divination_record_id: string | null
  }
  case_metadata: {
    feedback_content: string
    accuracy_rating: Accuracy | null
    occurred_at: string | null
    gua_original_name: string | null
    gua_changed_name: string | null
    is_liu_chong: boolean
    is_liu_he: boolean
    yong_shen: string | null
    archived_at: string
  }
  divination_record: any | null
  adopted_comment: any | null
  tags: Array<{ id: string; name: string; category: string; scope: string | null }>
  related: Array<any>
}

const styles = `
  .paper-texture {
    background-color: #f7f7f9;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  .font-serif-sc {
    font-family: "Source Han Serif CN", "source-han-serif-sc", "Source Han Serif", "Noto Serif SC", "Songti SC", "STSong", serif;
  }
  .stamp-animate {
    animation: stamp-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    opacity: 0;
    transform: scale(2) rotate(-10deg);
  }
  @keyframes stamp-in {
    to {
      opacity: 1;
      transform: scale(1) rotate(-12deg);
    }
  }
`

function splitHtmlContent(html: string) {
  const marker = '<h2>卦理推演</h2>'
  const idx = html.indexOf(marker)
  if (idx < 0) return { backgroundHtml: html, analysisHtml: '' }
  return {
    backgroundHtml: html.slice(0, idx).trim(),
    analysisHtml: html.slice(idx + marker.length).trim(),
  }
}

// 过滤掉关联排盘和卦项信息
function filterBackgroundContent(html: string): string {
  if (!html) return html
  
  let filtered = html

  // 1. 移除包含关键词的 strong/b/em 标签 (e.g. <strong>关联排盘：xxx</strong>)
  // 使用 [\s\S] 匹配所有字符包括换行
  filtered = filtered.replace(/<(strong|b|em)[^>]*>[\s\S]*?(关联排盘|问题|卦名|卦象)[:：][\s\S]*?<\/\1>/gi, '')

  // 2. 移除 Markdown 风格的加粗 (e.g. **关联排盘：xxx**)
  filtered = filtered.replace(/\*\*(关联排盘|问题|卦名|卦象)[:：][\s\S]*?\*\*/gi, '')

  // 3. 清理空标签和多余空白
  filtered = filtered
    // 移除空段落 (包含空白字符或&nbsp;)
    .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<div[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/div>/gi, '')
    // 移除连续的换行
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
    .trim()
  
  return filtered
}

export default function CaseDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiDetail | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [unarchiving, setUnarchiving] = useState(false)
  const [authorStats, setAuthorStats] = useState<{ publishedCases: number; likesReceived: number; level: number; accuracyRate: number } | null>(null)
  const [authorProfile, setAuthorProfile] = useState<{ nickname: string | null; avatar_url: string | null; exp: number; title_level: number } | null>(null)
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [isFollowingLoading, setIsFollowingLoading] = useState(false)
  const [adoptedCommentAuthorProfile, setAdoptedCommentAuthorProfile] = useState<{ exp: number; title_level: number } | null>(null)

  useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user))
  }, [])

  // 加载作者信息和统计
  useEffect(() => {
    const loadAuthorInfo = async () => {
      if (!data?.post?.user_id || !data?.post?.profiles) return
      
      try {
        const userId = data.post.user_id
        const [profile, stats, followStatus] = await Promise.all([
          getUserProfileById(userId),
          getUserStats(userId),
          currentUser && currentUser.id !== userId ? isFollowingUser(userId).catch(() => false) : Promise.resolve(false)
        ])
        
        if (profile) {
          setAuthorProfile({
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            exp: profile.exp || 0,
            title_level: profile.title_level || 1
          })
        }
        
        if (stats) {
          setAuthorStats({
            publishedCases: stats.publishedCases || 0,
            likesReceived: stats.likesReceived || 0,
            level: calculateLevel(profile?.exp || 0),
            accuracyRate: stats.accuracyRate || 0
          })
        }
        
        setIsFollowingAuthor(followStatus)
      } catch (error) {
        console.error('Failed to load author info:', error)
      }
    }
    
    void loadAuthorInfo()
  }, [data?.post?.user_id, data?.post?.profiles, currentUser])

  // 加载采纳评论作者的信息
  useEffect(() => {
    const loadAdoptedCommentAuthorInfo = async () => {
      if (!data?.adopted_comment?.profiles?.id) return
      
      try {
        const profile = await getUserProfileById(data.adopted_comment.profiles.id)
        if (profile) {
          setAdoptedCommentAuthorProfile({
            exp: profile.exp || 0,
            title_level: profile.title_level || 1
          })
        }
      } catch (error) {
        console.error('Failed to load adopted comment author info:', error)
      }
    }
    
    void loadAdoptedCommentAuthorInfo()
  }, [data?.adopted_comment?.profiles?.id])

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await fetch(`/api/library/cases/${id}`)
        const json = await res.json().catch(() => null)
        if (res.status === 404) {
          toast({ title: '案例未收录', description: '该帖子还未结案收录进案例库，已为你跳转到原帖。' })
          router.push(`/community/${id}`)
          return
        }
        if (!res.ok) throw new Error(json?.error || '加载失败')
        setData(json as ApiDetail)
      } catch (e) {
        toast({ title: '加载失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
        router.push('/cases')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, router, toast])

  const isBaziRecord = useMemo(() => {
    if (!data?.divination_record) return false
    const record = data.divination_record
    return record.method === 1 || record.original_key === 'bazi'
  }, [data?.divination_record])

  const baziData = useMemo(() => {
    if (!data?.divination_record) return null
    return getBaziInfo(data.divination_record)
  }, [data?.divination_record])

  const fullGuaData = useMemo(() => {
    if (!data?.divination_record || isBaziRecord) return null
    return convertDivinationRecordToFullGuaData(data.divination_record)
  }, [data?.divination_record, isBaziRecord])

  const handleUnarchive = async () => {
    if (!data?.post?.id) return
    if (!confirm('确定要撤销结案吗？撤销后该案例将变回普通帖子，相关排盘数据和反馈内容将被移除。')) return

    try {
      setUnarchiving(true)
      const session = await getSession()
      const token = session?.access_token

      if (!token) {
        toast({ title: '撤销失败', description: '未登录或登录已过期', variant: 'destructive' })
        return
      }

      const res = await fetch('/api/library/unarchive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ post_id: data.post.id })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '撤销失败')

      toast({ title: '已撤销结案', description: '该案例已变回普通帖子' })
      router.push(`/community/${data.post.id}`)
    } catch (e) {
      toast({ title: '撤销失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setUnarchiving(false)
    }
  }

  const accuracyConfig = useMemo(() => {
    const rating = data?.case_metadata.accuracy_rating
    if (rating === 'accurate') {
      return {
        text: '已验证·准确',
        color: 'text-green-700',
        bg: 'bg-green-100',
        border: 'border-green-200',
        icon: CheckCircle2,
      }
    }
    if (rating === 'partial') {
      return {
        text: '已验证·半准',
        color: 'text-yellow-700',
        bg: 'bg-yellow-100',
        border: 'border-yellow-200',
        icon: CheckCircle2,
      }
    }
    if (rating === 'inaccurate') {
      return {
        text: '已验证·不准',
        color: 'text-red-700',
        bg: 'bg-red-100',
        border: 'border-red-200',
        icon: CheckCircle2,
      }
    }
    return {
      text: '已结案',
      color: 'text-stone-500',
      bg: 'bg-stone-50',
      border: 'border-stone-200',
      icon: CheckCircle2,
    }
  }, [data?.case_metadata.accuracy_rating])

  const resultConfig = useMemo(() => {
    const rating = data?.case_metadata.accuracy_rating
    switch (rating) {
      case 'accurate':
        return {
          bg: 'bg-[#F0F9F6]',
          text: 'text-[#2E7D63]',
          stamp: {
            border: 'border-[#2E7D63]/30',
            text: 'text-[#2E7D63]/40',
            divider: 'bg-[#2E7D63]/40',
            label: '准确'
          }
        }
      case 'partial':
        return {
          bg: 'bg-[#FEFCE8]',
          text: 'text-[#A16207]',
          stamp: {
            border: 'border-[#A16207]/30',
            text: 'text-[#A16207]/40',
            divider: 'bg-[#A16207]/40',
            label: '半准'
          }
        }
      case 'inaccurate':
        return {
          bg: 'bg-[#FEF2F2]',
          text: 'text-[#B91C1C]',
          stamp: {
            border: 'border-[#B91C1C]/30',
            text: 'text-[#B91C1C]/40',
            divider: 'bg-[#B91C1C]/40',
            label: '不准'
          }
        }
      default:
        return {
          bg: 'bg-stone-50',
          text: 'text-stone-600',
          stamp: null
        }
    }
  }, [data?.case_metadata.accuracy_rating])



  const safeHtml = useMemo(() => {
    const raw = data?.post?.content_html || data?.post?.content || ''
    const sanitized = sanitizeHtml(raw)
    const split = splitHtmlContent(sanitized)
    return {
      ...split,
      backgroundHtml: filterBackgroundContent(split.backgroundHtml),
      backgroundText: stripHtmlToText(filterBackgroundContent(split.backgroundHtml)),
      analysisText: stripHtmlToText(split.analysisHtml),
    }
  }, [data?.post?.content_html, data?.post?.content])

  const safeAdoptedCommentHtml = useMemo(() => {
    const raw = data?.adopted_comment?.content || ''
    return sanitizeHtml(raw)
  }, [data?.adopted_comment?.content])

  if (loading) {
    return <CaseDetailSkeleton />
  }

  if (!data) {
    return <div className="min-h-screen paper-texture flex items-center justify-center text-stone-400">案例不存在</div>
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen paper-texture font-sans text-stone-800 pb-20 lg:pb-8">
        <DetailPageHeader
          backHref="/cases"
          backLabel="返回案例库"
          share={{
            title: data.post.title,
            url: typeof window !== 'undefined' ? window.location.href : ''
          }}
          actions={
            <>
              {currentUser && data && currentUser.id === data.post.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-stone-500 hover:text-red-600"
                  disabled={unarchiving}
                  onClick={handleUnarchive}
                  title="撤销结案"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="rounded-full text-stone-500">
                <Printer className="h-4 w-4" />
              </Button>
            </>
          }
        />

        <main className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 py-4 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 min-w-0 space-y-6 w-full">
            {/* 文章头部 */}
            <div className="px-4 sm:px-0 mb-6 lg:mb-8">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                {(() => {
                  const categoryTag = data.tags?.find(t => t.category === 'category')
                  if (categoryTag) {
                    return (
                      <span className="bg-[#C82E31] text-white text-[0.625rem] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-sm shadow-sm">
                        {categoryTag.name}
                      </span>
                    )
                  }
                  return null
                })()}
                {(() => {
                  const Icon = accuracyConfig.icon
                  return (
                    <span className={`${accuracyConfig.bg} ${accuracyConfig.color} ${accuracyConfig.border} border text-[0.625rem] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-sm flex items-center gap-1`}>
                      <Icon className="h-3 w-3" /> {accuracyConfig.text}
                    </span>
                  )
                })()}
                <span className="text-stone-400 text-[0.625rem] sm:text-xs">{new Date(data.post.created_at).toLocaleString()} 发布</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif-sc font-bold text-stone-900 leading-tight mb-4 sm:mb-6">
                {data.post.title}
              </h1>
            </div>
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-stone-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-stone-200 via-[#C82E31]/40 to-stone-200"></div>
              <div className="p-4 sm:p-6 lg:p-12 relative">
                {/* Background Section */}
                <div className="mb-14">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-3.5 bg-stone-300"></div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-400 uppercase tracking-widest">BACKGROUND / 背景</h3>
                  </div>
                  {safeHtml.backgroundHtml ? (
                    <p
                      className="text-base sm:text-lg text-stone-700 leading-relaxed sm:leading-loose text-justify font-serif-sc indent-8"
                      dangerouslySetInnerHTML={{ __html: safeHtml.backgroundHtml || '' }}
                    />
                  ) : (
                    <p className="text-base sm:text-lg text-stone-700 leading-relaxed sm:leading-loose text-justify font-serif-sc indent-8 whitespace-pre-wrap">
                      {safeHtml.backgroundText || ''}
                    </p>
                  )}
                </div>

               
                <Divider className='mb-14' />
                

                {(fullGuaData || (baziData && baziData.pillars)) && (
                  <div className="lg:hidden mb-14">
                    {fullGuaData && (
                      <>
                        <h2 className="text-sm font-bold text-stone-800 mb-3 px-2 flex items-center gap-2">
                          <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span> 卦象排盘
                        </h2>
                        <GuaPanelDual data={fullGuaData} recordId={data.divination_record?.id} />
                      </>
                    )}
                    {baziData && baziData.pillars && (
                      <>
                        <h2 className="text-sm font-bold text-stone-800 mb-3 px-2 flex items-center gap-2">
                          <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span> 八字排盘
                        </h2>
                        <BaZiPanelDual data={baziData} recordId={data.divination_record?.id} />
                      </>
                    )}
                  </div>
                )}

                {/* Analysis Section */}
                {(safeHtml.analysisHtml || safeHtml.analysisText) ? (
                  <div className="mb-14">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-0.75 h-3.5 bg-[#C82E31]"></div>
                      <h3 className="text-xs font-bold text-[#C82E31] uppercase tracking-[0.15em] font-sans">ANALYSIS / 卦理推演</h3>
                    </div>
                    {safeHtml.analysisHtml ? (
                      <div
                        className="prose prose-stone max-w-none text-stone-800 text-base sm:text-[1.0625rem] leading-[1.8] font-serif-sc text-justify"
                        dangerouslySetInnerHTML={{ __html: safeHtml.analysisHtml }}
                      />
                    ) : (
                      <div className="text-stone-800 text-base sm:text-[1.0625rem] leading-[1.8] font-serif-sc text-justify whitespace-pre-wrap">
                        {safeHtml.analysisText}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Result Section */}
                <div className={`relative overflow-hidden rounded-xl p-6 sm:p-8 mb-14 ${resultConfig.bg}`}>
                   <div className={`flex items-center gap-2 mb-4 ${resultConfig.text}`}>
                     <CheckCircle2 className="w-4 h-4" />
                     <h3 className="text-xs font-bold uppercase tracking-[0.15em] font-sans">Result / 实际反馈</h3>
                   </div>
                   <div className="text-base sm:text-[1.0625rem] text-stone-700 leading-[1.8] font-serif-sc mb-2 relative z-10 text-justify">
                     {data.case_metadata.feedback_content}
                   </div>
                   {data.case_metadata.occurred_at && (
                      <div className="text-sm text-stone-400 mt-4 relative z-10 font-serif-sc">应期：{new Date(data.case_metadata.occurred_at).toLocaleString()}</div>
                   )}
                   
                   {/* Stamp */}
                   {resultConfig.stamp && (
                     <div className="absolute -right-6 -bottom-6 w-40 h-40 opacity-90 pointer-events-none select-none">
                        <div className={`w-full h-full border-[0.1875rem] rounded-full flex items-center justify-center rotate-[-15deg] ${resultConfig.stamp.border}`}>
                          <div className={`w-[85%] h-[85%] border rounded-full flex items-center justify-center ${resultConfig.stamp.border}`}>
                             <div className={`flex flex-col items-center justify-center ${resultConfig.stamp.text}`}>
                                <span className="font-bold text-xl tracking-widest mb-1">验证</span>
                                <div className={`w-12 h-px my-1 ${resultConfig.stamp.divider}`}></div>
                                <span className="font-bold text-xl tracking-widest">{resultConfig.stamp.label}</span>
                             </div>
                          </div>
                        </div>
                     </div>
                   )}
                </div>

                {data.adopted_comment ? (
                  <>
                    <Divider />
                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <div className="w-1 h-4 sm:h-5 bg-[#C82E31] rounded-full"></div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#C82E31] uppercase tracking-widest">Featured / 采纳评论</h3>
                      </div>
                      <div className="bg-white border border-stone-200 rounded-lg p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-2">
                          {data.adopted_comment?.profiles?.id && data.adopted_comment?.profiles?.nickname ? (
                            <UserHoverCard userId={data.adopted_comment.profiles.id} nickname={data.adopted_comment.profiles.nickname}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-stone-800 hover:text-[#C82E31] transition-colors cursor-pointer">
                                  {data.adopted_comment.profiles.nickname}
                                </span>
                                {adoptedCommentAuthorProfile && (
                                  <>
                                    <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-stone-800 text-white font-mono shrink-0">
                                      Lv.{calculateLevel(adoptedCommentAuthorProfile.exp)}
                                    </span>
                                    {adoptedCommentAuthorProfile.title_level > 1 && (
                                      <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                        {getTitleName(adoptedCommentAuthorProfile.title_level)}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </UserHoverCard>
                          ) : (
                            <span className="text-xs text-stone-400">匿名</span>
                          )}
                          <span className="text-xs text-stone-300">·</span>
                          <span className="text-xs text-stone-400">
                            {data.adopted_comment?.created_at ? new Date(data.adopted_comment.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        {safeAdoptedCommentHtml ? (
                          <div
                            className="text-sm sm:text-base text-stone-800 leading-relaxed prose prose-stone max-w-none"
                            dangerouslySetInnerHTML={{ __html: safeAdoptedCommentHtml }}
                          />
                        ) : (
                          <div className="text-sm sm:text-base text-stone-800 leading-relaxed whitespace-pre-wrap">
                            {stripHtmlToText(data.adopted_comment?.content || '')}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Footer Stats */}
                <div className="flex items-center justify-between pt-8 border-t border-stone-100 text-stone-400 text-sm">
                   <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{data.post.like_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4" />
                        <span>0</span> 
                      </div>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span>浏览量 {data.post.view_count?.toLocaleString()}</span>
                   </div>
                </div>

              </div>
            </div>
            
            {/* Related Cases */}
            {data.related?.length ? (
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-[#C82E31]"></div>
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Related / 关联推荐</h3>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.related.map((r: any) => (
                      <Link key={r.post_id} href={`/cases/${r.post_id}`} className="block bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 hover:shadow-sm transition-all">
                        <div className="text-sm font-bold text-stone-800 line-clamp-2 mb-2 font-serif-sc">{r.posts?.title || '案例'}</div>
                        <div className="text-xs text-stone-400">{r.gua_original_name || ''}</div>
                      </Link>
                    ))}
                 </div>
              </div>
            ) : null}

          </div>

          <aside className="hidden lg:block lg:flex-[0_0_22.5rem] w-full">
            {/* Author Card */}
            {data?.post?.profiles && data.post.profiles.id && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 mb-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <Link href={`/u/${data.post.profiles.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all shrink-0">
                      <AvatarImage src={data.post.profiles.avatar_url || ''} />
                      <AvatarFallback className="bg-stone-100 text-stone-400 font-serif">
                        {data.post.profiles.nickname?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-stone-800 group-hover:text-[#C82E31] transition-colors truncate">
                          {data.post.profiles.nickname || '匿名'}
                        </h3>
                        {authorStats && (
                          <span className="text-[0.625rem] bg-stone-800 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                            Lv.{authorStats.level}
                          </span>
                        )}
                        {authorProfile && authorProfile.title_level > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            {getTitleName(authorProfile.title_level)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">每日一卦，精进不止。</p>
                    </div>
                  </Link>
                  {/* 关注按钮 - 右上角 */}
                  {currentUser && currentUser.id !== data.post.profiles.id && (
                    <Button
                      className={`text-xs h-8 shadow-sm transition-all shrink-0 ${
                        isFollowingAuthor
                          ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          : 'bg-[#C82E31] text-white hover:bg-[#A93226]'
                      }`}
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isFollowingLoading || !data.post.profiles?.id) return
                        try {
                          setIsFollowingLoading(true)
                          const newFollowingStatus = await toggleFollowUser(data.post.profiles.id)
                          setIsFollowingAuthor(newFollowingStatus)
                          toast({
                            title: newFollowingStatus ? '已关注' : '已取消关注',
                            description: newFollowingStatus
                              ? `现在可以查看 ${data.post.profiles.nickname || '该用户'} 的动态了`
                              : ''
                          })
                        } catch (error) {
                          console.error('Error toggling follow:', error)
                          const errorMessage = error instanceof Error ? error.message : '请稍后重试'
                          toast({
                            title: '操作失败',
                            description: errorMessage,
                            variant: 'destructive'
                          })
                        } finally {
                          setIsFollowingLoading(false)
                        }
                      }}
                      disabled={isFollowingLoading}
                    >
                      {isFollowingLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          处理中
                        </>
                      ) : isFollowingAuthor ? (
                        '已关注'
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-1.5" />
                          关注
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {authorStats && (
                  <div className="grid grid-cols-3 gap-2 py-3 bg-stone-50 rounded-lg text-center">
                    <div>
                      <div className="text-lg font-bold text-stone-800">{authorStats.publishedCases}</div>
                      <div className="text-[0.625rem] text-stone-400 uppercase">案例</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-stone-800">{authorStats.likesReceived}</div>
                      <div className="text-[0.625rem] text-stone-400 uppercase">获赞</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-600">
                        {authorStats.accuracyRate > 0 ? `${Math.round(authorStats.accuracyRate)}%` : '-'}
                      </div>
                      <div className="text-[0.625rem] text-stone-400 uppercase">准确率</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 卦象排盘 / 八字排盘 - Sticky */}
            {(fullGuaData || (baziData && baziData.pillars)) && (
              <div className="lg:sticky lg:top-24 lg:z-10 space-y-4">
                {fullGuaData && (
                  <div>
                    <h2 className="text-sm font-bold text-stone-800 mb-3 px-2 flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span> 卦象排盘
                    </h2>
                    <GuaPanelDual data={fullGuaData} recordId={data.divination_record?.id} />
                  </div>
                )}
                {baziData && baziData.pillars && (
                  <div>
                    <h2 className="text-sm font-bold text-stone-800 mb-3 px-2 flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span> 八字排盘
                    </h2>
                    <BaZiPanelDual data={baziData} recordId={data.divination_record?.id} />
                  </div>
                )}
              </div>
            )}
          </aside>
        </main>
      </div>
    </>
  )
}
