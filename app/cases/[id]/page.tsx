'use client'

import Divider from '@/lib/components/Divider'
import GuaPanel from '@/lib/components/GuaPanel'
import { Button } from '@/lib/components/ui/button'
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  MessageSquare,
  Printer,
  Share2,
  ThumbsUp
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

// -----------------------------------------------------------------------------
// 样式定义：新中式纹理与排版
// -----------------------------------------------------------------------------
const styles = `
  /* 宣纸纹理 - 增加页面质感 */
  .paper-texture {
    background-color: #f7f7f9;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  
  .font-serif-sc {
    font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  }
  
  /* 验证印章动画 */
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

// -----------------------------------------------------------------------------
// 模拟数据 (Mock Data)
// -----------------------------------------------------------------------------
const CASE_DETAIL = {
  id: 1,
  question: "下个月竞聘大区经理，竞争激烈，想看能否成功？",
  publishTime: "2023-10-24 14:30",
  viewCount: 3420,
  author: {
    name: "玄机子",
    avatar: "",
    level: 8,
    isVerified: true,
    bio: "专注职场升迁预测，实战派。"
  },
  // 排盘基础信息
  divinationInfo: {
    date: "癸卯年 壬戌月 丁巳日",
    time: "未时 (13:00-15:00)",
    method: "金钱课",
    kongWang: "子丑",
  },
  // 卦象数据 (简化的结构)
  gua: {
    name: "水火既济",
    type: "六合卦",
    lines: [
      { position: 6, yinYang: 'yin' as const, liuqin: '兄弟', ganzhi: '戊子水', liushou: '青龙', active: false, subject: false, object: false },
      { position: 5, yinYang: 'yang' as const, liuqin: '官鬼', ganzhi: '戊戌土', liushou: '玄武', active: true, subject: false, object: false, change: { liuqin: '父母', ganzhi: '申金' } },
      { position: 4, yinYang: 'yin' as const, liuqin: '父母', ganzhi: '戊申金', liushou: '白虎', active: false, subject: false, object: true },
      { position: 3, yinYang: 'yang' as const, liuqin: '兄弟', ganzhi: '己亥水', liushou: '螣蛇', active: true, subject: true, object: false, change: { liuqin: '子孙', ganzhi: '卯木' } },
      { position: 2, yinYang: 'yin' as const, liuqin: '官鬼', ganzhi: '己丑土', liushou: '勾陈', active: false, subject: false, object: false },
      { position: 1, yinYang: 'yang' as const, liuqin: '子孙', ganzhi: '己卯木', liushou: '朱雀', active: false, subject: false, object: false },
    ]
  },
  content: {
    background: "本人男，35岁，现任某快消品牌副经理。下个月公司内部竞聘大区经理，主要竞争对手有两个，一个资历老但业绩平平，一个年轻但不仅是海归还是总经理亲戚。最近压力很大，不知道胜算几何。",
    analysis: [
      "1. **世应关系**：世爻兄弟亥水持世，临螣蛇，说明你现在内心非常纠结、不安，甚至有些疑神疑鬼。应爻父母申金生世爻，说明这个职位本身是对你有利的，或者说上级领导（父母爻）对你是认可的。",
      "2. **官鬼情况**：官鬼戌土发动，化出父母申金。官鬼代表职位，动而化回头生，虽然有变数，但整体趋势向好。特别是五爻君位动，说明高层有变动或者高层在关注此事。",
      "3. **月建日辰**：月建戌土克世爻亥水，日辰巳火冲世爻（巳亥冲）。这叫'日破'，虽然有动爻相生，但自身根基不稳，或者说你当下的状态极差，信心不足，或者近期犯了小错误被抓住了把柄。",
      "4. **综合推断**：卦名'既济'，本意是成功，但初吉终乱。结合日破来看，这次竞聘过程会非常惊险。虽然领导看好你，但竞争对手（兄弟爻暗伏）手段强硬。我认为能成，但需要险中求胜，且上任后压力极大。"
    ],
    feedback: {
      status: "verified",
      result: "feedback-success",
      text: "【反馈】太准了！确实过程非常惊险。竞聘演讲当天我因为太紧张差点忘词（应了螣蛇），但好在之前的业绩数据很扎实（应父母生世）。最后险胜海归那一位。确实如大师所说，现在上任了压力巨大。"
    }
  }
}

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------
interface DivinationInfo {
  date: string
  time: string
  method: string
  kongWang: string
}

interface GuaLine {
  position: number
  yinYang: 'yin' | 'yang'
  liuqin: string
  ganzhi: string
  liushou: string
  active: boolean
  subject: boolean
  object: boolean
  change?: { liuqin: string; ganzhi: string }
}

interface Gua {
  name: string
  type: string
  lines: GuaLine[]
}

interface CaseDetail {
  id: number
  question: string
  publishTime: string
  viewCount: number
  author: {
    id?: string
    name: string
    avatar: string
    level: number
    isVerified: boolean
    bio: string
  }
  divinationInfo: DivinationInfo
  gua: Gua
  content: {
    background: string
    analysis: string[]
    feedback: {
      status: string
      result: string
      text: string
    }
  }
}


// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

export default function CaseDetailPage({ params }: CaseDetailPageProps) {
  // 解包 params Promise
  const { id } = React.use(params)
  const router = useRouter()
  
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(180)
  const [commentCount] = useState(24)
  const [starCount] = useState(127)

  // TODO: 根据 id 获取实际数据
  const caseData = CASE_DETAIL as CaseDetail

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleBackToCases = () => {
    router.push('/cases')
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen paper-texture font-sans text-stone-800 pb-20 lg:pb-8">
        
        {/* 顶部导航 (面包屑与操作) */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 h-14 flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Button 
              variant="ghost" 
              className="hover:text-stone-900 flex items-center h-auto p-1.5 -ml-2 sm:ml-0"
              onClick={handleBackToCases}
            >
              <ArrowLeft className="h-5 w-5 sm:mr-1"/> <span className="hidden sm:inline">案例库</span>
            </Button>
            <span className="hidden sm:inline text-stone-300">/</span>
            <span className="text-stone-800 font-medium truncate max-w-[150px] sm:max-w-none">案例 #{id}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" className="rounded-full text-stone-500">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-stone-500">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 py-4 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 relative">
          
          {/* 中间内容区 (Article) - 增加纸张背景 */}
          <div className="flex-1 min-w-0 w-full">
            
            {/* 文章头部 */}
            <div className="px-4 sm:px-0 mb-6 lg:mb-8">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="bg-[#C82E31] text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-sm shadow-sm">事业</span>
                <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 已验证 · 准确
                </span>
                <span className="text-stone-400 text-[10px] sm:text-xs">{caseData.publishTime} 发布</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif-sc font-bold text-stone-900 leading-tight mb-4 sm:mb-6">
                {caseData.question}
              </h1>

              {/* 移动端作者信息 */}
              <div className="lg:hidden flex items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-stone-100 shadow-sm">
                 <div className="w-10 h-10 rounded-full bg-stone-200 border border-white shadow-sm flex items-center justify-center text-base font-serif text-stone-600">
                    {caseData.author.name[0]}
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">{caseData.author.name}</span>
                      <span className="text-[10px] bg-[#C82E31] text-white px-1.5 py-0.5 rounded-sm">LV.{caseData.author.level}</span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">{caseData.author.bio}</div>
                 </div>
              </div>
            </div>

            {/* 纸张卡片容器 */}
            <div className="bg-white border-y sm:border sm:rounded-xl shadow-sm p-5 sm:p-8 lg:p-12 relative overflow-hidden">
              
              {/* 装饰：顶部红线 */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 via-[#C82E31]/40 to-stone-200"></div>

              {/* 背景部分 */}
              <div className="mb-8 lg:mb-10 relative">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="w-1 h-4 sm:h-5 bg-stone-300 rounded-full"></div>
                  <h3 className="text-xs sm:text-sm font-bold text-stone-400 uppercase tracking-widest">Background / 背景</h3>
                </div>
                <p className="text-base sm:text-lg text-stone-700 leading-relaxed sm:leading-loose text-justify font-serif-sc indent-8">
                  {caseData.content.background}
                </p>
              </div>

              {/* 移动端卦象面板 */}
              <div className="lg:hidden mb-8 bg-stone-50 rounded-lg p-1 border border-stone-100">
                <GuaPanel info={caseData.divinationInfo} gua={caseData.gua} />
              </div>

              {/* 分割线 */}
              <Divider />

              {/* 推演部分 */}
              <div className="mb-10 lg:mb-12">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-1 h-4 sm:h-5 bg-[#C82E31] rounded-full"></div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#C82E31] uppercase tracking-widest">Analysis / 卦理推演</h3>
                </div>
                
                <div className="space-y-5 sm:space-y-6 text-stone-800 leading-relaxed text-base sm:text-lg">
                  {caseData.content.analysis.map((para, idx) => {
                    // 提取标题部分
                    const titleMatch = para.match(/^(\d+\.\s+\*\*.*?\*\*：?)/)
                    if (titleMatch) {
                      const title = titleMatch[1].replace(/\*\*/g, '')
                      const content = para.replace(/^\d+\.\s+\*\*.*?\*\*：?\s*/, '')
                      return (
                        <div key={idx} className="group">
                          <span className="font-bold text-stone-900 mr-2 group-hover:text-[#C82E31] transition-colors">
                            {title}
                          </span>
                          {content.split(/'日破'/).map((part, i, arr) => {
                            if (i === arr.length - 1) return <React.Fragment key={i}>{part}</React.Fragment>
                            return (
                              <React.Fragment key={i}>
                                {part}
                                <span className="bg-stone-100 text-stone-900 px-1 mx-1 rounded border border-stone-200 font-medium font-serif-sc text-sm">日破</span>
                              </React.Fragment>
                            )
                          })}
                        </div>
                      )
                    }
                    // 综合推断特殊样式
                    if (para.includes('综合推断')) {
                      const content = para.replace(/^4\.\s+\*\*综合推断\*\*：\s*/, '')
                      return (
                        <div key={idx} className="bg-[#fcfbf9] border-l-4 border-[#C82E31] p-3 sm:p-4 my-4 sm:my-6 italic text-stone-600 text-sm sm:text-base">
                          <span className="font-bold text-[#C82E31] not-italic mr-2">4. 综合推断：</span>
                          {content}
                        </div>
                      )
                    }
                    // 处理普通段落，提取加粗文本
                    const parts: (string | React.ReactElement)[] = []
                    let lastIndex = 0
                    const boldRegex = /\*\*(.*?)\*\*/g
                    let boldMatch: RegExpExecArray | null
                    
                    while ((boldMatch = boldRegex.exec(para)) !== null) {
                      if (boldMatch.index !== undefined && boldMatch.index > lastIndex) {
                        parts.push(para.slice(lastIndex, boldMatch.index))
                      }
                      if (boldMatch.index !== undefined) {
                        parts.push(
                          <strong key={boldMatch.index} className="text-stone-900 font-bold">
                            {boldMatch[1]}
                          </strong>
                        )
                        lastIndex = boldMatch.index + boldMatch[0].length
                      }
                    }
                    if (lastIndex < para.length) {
                      parts.push(para.slice(lastIndex))
                    }
                    
                    return (
                      <p key={idx} className="leading-relaxed">
                        {parts}
                      </p>
                    )
                  })}
                </div>
              </div>

              {/* 结果反馈 (印章效果) */}
              <div className="relative mt-10 sm:mt-12 p-5 sm:p-6 pb-12 sm:pb-6 pr-6 sm:pr-40 rounded-lg bg-green-50/50 border border-green-100/50 overflow-hidden">
                {/* 印章 - 移动端缩小 */}
                <div className="absolute -right-4 -bottom-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border-[3px] border-green-700/10 sm:border-green-700/20 rounded-full flex items-center justify-center stamp-animate pointer-events-none opacity-40 sm:opacity-100 rotate-[-15deg]">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 border border-green-700/20 sm:border-green-700/30 rounded-full flex items-center justify-center">
                    <span className="text-green-800 font-black text-sm sm:text-xl tracking-widest opacity-60 sm:opacity-80">验证·准确</span>
                  </div>
                </div>
                
                <h3 className="text-xs sm:text-sm font-bold text-green-800 mb-2 flex items-center gap-2 relative z-10">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Result / 实际反馈
                </h3>
                <p className="text-green-900/80 leading-relaxed relative z-10 font-serif-sc text-sm sm:text-base">
                  {caseData.content.feedback.text.replace(/【反馈】/, '')}
                </p>
              </div>

              {/* 文章底部操作栏 - 仅桌面端显示 */}
              <div className="hidden lg:flex mt-8 pt-6 border-t border-stone-200 items-center justify-between">
                <div className="flex items-center gap-6">
                  <Button
                    onClick={handleLike}
                    variant="ghost"
                    className="rounded-full hover:bg-red-50 text-stone-600 hover:text-[#C82E31]"
                  >
                    <ThumbsUp className={`h-5 w-5 ${isLiked ? 'fill-[#C82E31] text-[#C82E31]' : ''}`} />
                    <span className="text-sm font-medium">{likeCount}</span>
                  </Button>
                  <Button
                    onClick={() => setIsSaved(!isSaved)}
                    variant="ghost"
                    className="rounded-full hover:bg-yellow-50 text-stone-600 hover:text-yellow-600"
                  >
                    <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    <span className="text-sm font-medium">{starCount}</span>
                  </Button>
                </div>
                <div className="text-stone-400 text-sm">
                  浏览量 {caseData.viewCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 评论区 */}
            <div className="mt-8 bg-white border border-stone-100 shadow-sm rounded-xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-stone-600" />
                  易友讨论 ({commentCount})
                </h3>
              </div>
              
              <div className="space-y-6">
                {/* 评论输入框 */}
                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/50">
                  <textarea
                    placeholder="写下你的看法..."
                    className="w-full min-h-[100px] bg-transparent border-none outline-none resize-none text-stone-700 placeholder-stone-400"
                  />
                  <div className="flex items-center justify-end gap-3 mt-3">
                    <Button variant="ghost" size="sm" className="text-stone-500 hover:text-stone-700">
                      取消
                    </Button>
                    <Button size="sm" className="bg-[#C82E31] text-white rounded-full hover:bg-[#B02528]">
                      发布
                    </Button>
                  </div>
                </div>

                {/* 评论列表 */}
                <div className="space-y-4">
                  <div className="bg-stone-50/50 rounded-lg p-4 border border-stone-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-serif text-stone-600">
                          易
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-stone-900">易学爱好者007</span>
                            <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">LV.3</span>
                          </div>
                          <span className="text-xs text-stone-400">2小时前</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed pl-11">
                      这个日破确实是关键，断得非常大胆。如果是我的话，可能看到官鬼动化回头生就直接断吉了，容易忽略过程的凶险。受教了。
                    </p>
                    <div className="flex items-center gap-4 mt-3 pl-11">
                      <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-[#C82E31] h-auto p-0">
                        <ThumbsUp className="h-3 w-3" />
                        12
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-stone-600 h-auto p-0">
                        回复
                      </Button>
                    </div>
                  </div>

                  <div className="bg-stone-50/50 rounded-lg p-4 border border-stone-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-serif text-stone-600">
                          玄
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-stone-900">玄机子</span>
                            <span className="text-[10px] bg-[#C82E31] text-white px-1.5 py-0.5 rounded">LV.8</span>
                            <span className="text-xs text-stone-400">作者</span>
                          </div>
                          <span className="text-xs text-stone-400">3小时前</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed pl-11">
                      感谢反馈！日破确实是这个卦的关键点，很多人容易忽略。实战中，日破往往代表过程中的波折，但如果有动爻相生，最终还是能成的。
                    </p>
                    <div className="flex items-center gap-4 mt-3 pl-11">
                      <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-[#C82E31] h-auto p-0">
                        <ThumbsUp className="h-3 w-3" />
                        28
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-stone-600 h-auto p-0">
                        回复
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 右侧信息栏 (Sidebar) - 优化卦盘展示 */}
          <aside className="hidden lg:block w-[340px] shrink-0 space-y-6">
            
            {/* 作者卡片 */}
            {caseData.author.id ? (
              <Link href={`/u/${caseData.author.id}`} className="block bg-white rounded-xl border border-stone-200 shadow-sm p-4 hover:shadow-md hover:border-[#C82E31]/20 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-stone-200 border border-white shadow-sm flex items-center justify-center text-lg font-serif text-stone-600 group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all">
                    {caseData.author.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 group-hover:text-[#C82E31] transition-colors">{caseData.author.name}</span>
                      <span className="text-[10px] bg-[#C82E31] text-white px-1.5 py-0.5 rounded-sm">LV.{caseData.author.level}</span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">{caseData.author.bio}</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-stone-200 border border-white shadow-sm flex items-center justify-center text-lg font-serif text-stone-600">
                  {caseData.author.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{caseData.author.name}</span>
                    <span className="text-[10px] bg-[#C82E31] text-white px-1.5 py-0.5 rounded-sm">LV.{caseData.author.level}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{caseData.author.bio}</div>
                </div>
                <Button variant="outline" size="sm" className="ml-auto text-xs rounded-full">
                  关注
                </Button>
              </div>
            )}

            {/* 卦象面板 (组件) */}
            <div className="sticky top-20">
              <GuaPanel info={caseData.divinationInfo} gua={caseData.gua} />
            </div>
          </aside>
        </main>

        {/* Mobile Bottom Action Bar */}
        <div 
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 px-6 pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', height: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-8">
            <button onClick={handleLike} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
              <ThumbsUp className={`h-5 w-5 ${isLiked ? 'fill-[#C82E31] text-[#C82E31]' : ''}`} />
              <span className="text-[10px] font-medium">{likeCount}</span>
            </button>
            <button onClick={() => setIsSaved(!isSaved)} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
              <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="text-[10px] font-medium">{isSaved ? '已收藏' : '收藏'}</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
              <Share2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">分享</span>
            </button>
          </div>
          <Button 
            className="rounded-full bg-[#C82E31] hover:bg-[#a61b1f] text-white px-8 shadow-sm shadow-red-100 active:scale-95 transition-transform h-9"
            onClick={() => {
              const textarea = document.querySelector('textarea');
              if (textarea) {
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
              }
            }}
          >
            写评论
          </Button>
        </div>
      </div>
    </>
  )
}

