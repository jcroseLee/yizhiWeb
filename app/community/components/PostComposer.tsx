'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Textarea } from '@/lib/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { createPost } from '@/lib/services/community'
import { getUserProfile } from '@/lib/services/profile'
import { BookOpen, Coffee, Coins, Compass, HelpCircle, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// -----------------------------------------------------------------------------
// 样式定义
// -----------------------------------------------------------------------------
const styles = `
  /* 输入框轮播提示动画 */
  @keyframes fadeInOut {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  
  .input-placeholder-rotate {
    animation: fadeInOut 4s ease-in-out infinite;
  }

  /* 输入框高度动画 */
  .textarea-container {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .textarea-container.focused {
    min-height: 120px;
  }

  /* 分类按钮组动画 */
  .category-group {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
  }

  .category-group.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
`

// -----------------------------------------------------------------------------
// 分类配置
// -----------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'theory', label: '论道', icon: BookOpen, color: 'text-blue-600' },
  { id: 'help', label: '悬卦', icon: HelpCircle, color: 'text-amber-600' },
  { id: 'debate', label: '争鸣', icon: TrendingUp, color: 'text-red-600' },
  { id: 'chat', label: '茶寮', icon: Coffee, color: 'text-green-600' },
]

// -----------------------------------------------------------------------------
// 发布器组件
// -----------------------------------------------------------------------------

const TITLE_MAX_LENGTH = 50
const CONTENT_MAX_LENGTH = 300
const CONTENT_MIN_LENGTH = 100

// -----------------------------------------------------------------------------
// CategoryTag 组件
// -----------------------------------------------------------------------------
interface CategoryTagProps {
  category: {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }
  isSelected: boolean
  onClick: () => void
}

const CategoryTag = ({ category, isSelected, onClick }: CategoryTagProps) => {
  const Icon = category.icon
  
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isSelected
          ? 'bg-[#C82E31]/10 text-[#C82E31]'
          : 'bg-white text-stone-700 hover:bg-stone-50'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${isSelected ? category.color : 'text-stone-500'}`} />
      <span>{category.label}</span>
    </a>
  )
}

export default function PostComposer() {
  const router = useRouter()
  const { toast } = useToast()
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showMinLengthError, setShowMinLengthError] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [contentError, setContentError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userNickname, setUserNickname] = useState<string>('')
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 获取当前用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const profile = await getUserProfile()
        if (profile) {
          setUserAvatar(profile.avatar_url)
          setUserNickname(profile.nickname || '')
        }
      } catch (error) {
        console.error('Failed to load user info:', error)
      }
    }
    loadUserInfo()
  }, [])
  
  // 输入框提示文案轮播
  const placeholders = [
    '最近在想什么事？用卦象来帮你理一理思路...',
    '发表你的高见，或悬赏征集各路大神的解读...',
    '小提示：附上卦象数据，更容易吸引大神来讨论~',
  ]
  
  // 轮播提示文案（仅在未聚焦时）
  useEffect(() => {
    if (isFocused) return
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [placeholders.length, isFocused])

  // 清理失焦定时器
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  // 点击占位符区域切换到输入框
  const handlePlaceholderClick = () => {
    setIsFocused(true)
    // 延迟聚焦以确保 DOM 更新完成
    setTimeout(() => {
      titleTextareaRef.current?.focus()
    }, 0)
  }

  // 处理输入框聚焦
  const handleFocus = () => {
    // 清除可能存在的失焦定时器
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsFocused(true)
  }

  // 处理输入框失焦（如果内容为空，可以切换回占位符模式）
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // 清除之前的定时器
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    // 检查焦点是否移到了容器内的其他元素
    const relatedTarget = e.relatedTarget as Node | null
    const container = containerRef.current
    
    // 如果焦点移到了容器内的其他元素，不关闭
    if (container && relatedTarget && container.contains(relatedTarget)) {
      return
    }
    
    // 延迟检查，以便点击分类按钮或其他交互元素时不会立即失焦
    blurTimeoutRef.current = setTimeout(() => {
      // 再次检查是否有焦点在输入框上
      const activeElement = document.activeElement
      if (
        activeElement !== titleTextareaRef.current &&
        activeElement !== contentTextareaRef.current &&
        !title.trim() &&
        !content.trim()
      ) {
        setIsFocused(false)
      }
      blurTimeoutRef.current = null
    }, 200)
  }

  // 处理分类选择
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    // 选择分类后重新聚焦输入框
    setTimeout(() => {
      if (content.trim()) {
        contentTextareaRef.current?.focus()
      } else {
        titleTextareaRef.current?.focus()
      }
    }, 0)
  }

  // 处理发布
  const handlePublish = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    let hasError = false

    // 校验标题
    if (!trimmedTitle) {
      setTitleError(true)
      hasError = true
      setTimeout(() => {
        titleTextareaRef.current?.focus()
      }, 0)
    } else {
      setTitleError(false)
    }

    // 校验内容
    if (!trimmedContent) {
      setContentError(true)
      hasError = true
      if (!hasError) {
        setTimeout(() => {
          contentTextareaRef.current?.focus()
        }, 0)
      }
    } else if (trimmedContent.length < CONTENT_MIN_LENGTH) {
      setShowMinLengthError(true)
      setContentError(false)
      hasError = true
      setTimeout(() => {
        contentTextareaRef.current?.focus()
        // 3秒后隐藏错误提示
        setTimeout(() => {
          setShowMinLengthError(false)
        }, 3000)
      }, 0)
    } else {
      setContentError(false)
      setShowMinLengthError(false)
    }

    // 如果有错误，不继续发布
    if (hasError) {
      return
    }
    
    // 发布帖子
    try {
      setIsSubmitting(true)
      const post = await createPost({
        title: trimmedTitle,
        content: trimmedContent,
        type: (selectedCategory as 'theory' | 'help' | 'debate' | 'chat') || undefined,
      })
      
      toast({
        title: '发布成功',
        description: '您的帖子已成功发布',
      })
      
      // 清空表单
      setTitle('')
      setContent('')
      setSelectedCategory(null)
      setIsFocused(false)
      
      // 跳转到帖子详情页
      router.push(`/community/${post.id}`)
      router.refresh() // 刷新页面以更新帖子列表
    } catch (error) {
      console.error('Failed to create post:', error)
      const errorMessage = error instanceof Error ? error.message : '无法发布帖子，请稍后重试'
      toast({
        title: '发布失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
        {/* 装饰性背景 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#C82E31]/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
        
        <div className="flex gap-4 relative z-10">
          <Avatar className="w-11 h-11 border border-stone-200 shadow-sm shrink-0">
            {userAvatar && <AvatarImage src={userAvatar} alt={userNickname || '用户'} />}
            <AvatarFallback className="bg-gradient-to-br from-stone-100 to-stone-200 text-stone-500">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {/* 输入框容器 */}
            <div 
              ref={containerRef}
              className={`textarea-container ${isFocused ? 'focused' : ''}`}
              onMouseDown={(e) => {
                // 如果点击的是容器本身，阻止默认行为，确保可以正常聚焦
                if (e.target === e.currentTarget) {
                  e.preventDefault()
                }
              }}
            >
              {!isFocused ? (
                // 占位符模式
                <div 
                  onClick={handlePlaceholderClick}
                  className="bg-stone-50 hover:bg-stone-100 transition-colors rounded-lg p-3 cursor-text text-stone-500 text-sm mb-3 shadow-inner border border-stone-100 min-h-[44px] flex items-center"
                >
              <span className="italic input-placeholder-rotate">
                {placeholders[placeholderIndex]}
              </span>
            </div>
              ) : (
                // 输入框模式 - 参考知乎设计
                <div className="mb-3 space-y-0">
                  {/* 标题区域 - TitleArea */}
                  <div 
                    className="relative mb-3"
                    onMouseDown={(e) => {
                      // 阻止事件冒泡
                      e.stopPropagation()
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Textarea
                        ref={titleTextareaRef}
                        value={title}
                        onChange={(e) => {
                          const newValue = e.target.value
                          if (newValue.length <= TITLE_MAX_LENGTH) {
                            setTitle(newValue)
                            // 输入时清除错误提示
                            if (titleError && newValue.trim()) {
                              setTitleError(false)
                            }
                          }
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onMouseDown={(e) => {
                          // 阻止事件冒泡
                          e.stopPropagation()
                        }}
                        placeholder="添加标题"
                        maxLength={TITLE_MAX_LENGTH}
                        className={`flex-1 bg-transparent border-0 p-0 text-base placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-hidden transition-colors ${
                          titleError 
                            ? 'text-red-600 placeholder:text-red-400' 
                            : 'text-stone-900'
                        }`}
                        style={{ height: '28px', minHeight: '28px' }}
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement
                          target.style.height = '28px'
                          target.style.height = `${Math.min(target.scrollHeight, 28)}px`
                        }}
                      />
                      {/* 字符计数 - 右侧显示 */}
                      <div className={`text-xs shrink-0 transition-colors ${
                        titleError
                          ? 'text-red-500 font-medium'
                          : title.length >= TITLE_MAX_LENGTH 
                          ? 'text-red-500 font-medium' 
                          : title.length >= TITLE_MAX_LENGTH * 0.8 
                          ? 'text-amber-500' 
                          : 'text-stone-400'
                      }`}>
                        {title.length}/{TITLE_MAX_LENGTH}
                      </div>
                    </div>
                    {/* 标题错误提示 */}
                    {titleError && (
                      <div className="mt-1 text-xs text-red-500 animate-in fade-in-0">
                        请输入标题
                      </div>
                    )}
                  </div>
                  
                  {/* 内容区域 - EditorArea */}
                  <div 
                    className="relative"
                    onMouseDown={(e) => {
                      // 阻止事件冒泡，确保点击内容区域时不会触发其他事件
                      e.stopPropagation()
                    }}
                  >
                    <Textarea
                      ref={contentTextareaRef}
                      value={content}
                      onChange={(e) => {
                        const newValue = e.target.value
                        if (newValue.length <= CONTENT_MAX_LENGTH) {
                          setContent(newValue)
                          // 输入时清除错误提示
                          if (contentError && newValue.trim()) {
                            setContentError(false)
                          }
                          if (showMinLengthError && newValue.trim().length >= CONTENT_MIN_LENGTH) {
                            setShowMinLengthError(false)
                          }
                        }
                      }}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      onMouseDown={(e) => {
                        // 阻止事件冒泡
                        e.stopPropagation()
                      }}
                      placeholder="分享你此刻的想法..."
                      maxLength={CONTENT_MAX_LENGTH}
                      className={`w-full bg-transparent border-0 p-0 text-sm placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none transition-colors ${
                        contentError || showMinLengthError
                          ? 'text-red-600 placeholder:text-red-400' 
                          : 'text-stone-900'
                      }`}
                      style={{ minHeight: '38px' }}
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = `${Math.max(target.scrollHeight, 38)}px`
                      }}
                    />
                    {/* 字数提示和错误提示 */}
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {contentError && (
                          <span className="text-xs text-red-500 animate-in fade-in-0">
                            请输入内容
                          </span>
                        )}
                        {!contentError && showMinLengthError && (
                          <span className="text-xs text-red-500 animate-in fade-in-0">
                            内容至少需要 {CONTENT_MIN_LENGTH} 字
                          </span>
                        )}
                        {!contentError && !showMinLengthError && content.trim().length > 0 && content.trim().length < CONTENT_MIN_LENGTH && (
                          <span className="text-xs text-amber-500">
                            还需 {CONTENT_MIN_LENGTH - content.trim().length} 字
                          </span>
                        )}
                      </div>
                      {content.length > 0 && (
                        <span className={`text-xs transition-colors ${
                          content.length >= CONTENT_MAX_LENGTH 
                            ? 'text-red-500 font-medium' 
                            : content.length >= CONTENT_MAX_LENGTH * 0.8 
                            ? 'text-amber-500' 
                            : 'text-stone-400'
                        }`}>
                          {content.length}/{CONTENT_MAX_LENGTH}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 分类选择按钮组 - 使用 Tag 组件 */}
                  <div className={`category-group ${isFocused ? 'visible' : ''} mt-2`}>
                    <div className="inline-flex h-auto items-center justify-start gap-2">
                      {CATEGORIES.map((category) => (
                        <CategoryTag
                          key={category.id}
                          category={category}
                          isSelected={selectedCategory === category.id}
                          onClick={() => handleCategoryChange(category.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 工具栏显性化 - 在输入框下方显示排盘入口 */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Link 
                  href="/community/publish?tab=divination"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full hover:bg-stone-100 text-xs font-medium text-stone-700 transition-colors border border-stone-200 hover:border-[#C82E31]/30 hover:text-[#C82E31]"
                >
                  <Compass className="h-4 w-4 text-[#C82E31]" />
                  <span>求测</span>
                </Link>
                <Link 
                  href="/community/publish?tab=article"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full hover:bg-amber-50 text-xs font-medium text-stone-700 transition-colors border border-stone-200 hover:border-amber-300 hover:text-amber-600"
                >
                  <Coins className="h-4 w-4 text-amber-600" />
                  <span>发文章</span>
                </Link>
              </div>
              <button 
                onClick={handlePublish}
                disabled={!title.trim() || !content.trim() || isSubmitting}
                className={`text-sm px-6 py-1.5 rounded-full hover:shadow-md transition-all font-medium shadow-sm ${
                  title.trim() && content.trim() && !isSubmitting
                    ? 'bg-[#C82E31] text-white hover:bg-[#a61b1f]'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

