'use client'

import { Badge } from '@/lib/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/lib/components/ui/breadcrumb"
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { WikiCategory, WikiService, WikiTag } from '@/lib/services/wiki'
import {
  ChevronRight,
  Circle,
  Compass,
  FileText,
  GitBranch,
  Hash,
  Layout,
  Menu,
  Network,
  Search,
  Share2,
  Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// --- 样式补丁：树状图连接线与纹理 ---
const styles = `
  /* 宣纸纹理 */
  .paper-texture {
    background-color: #F9F7F2;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  }

  /* 隐藏滚动条 */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* 树状连接线 */
  .tree-line {
    position: relative;
  }
  .tree-line::before {
    content: '';
    position: absolute;
    left: 11px; /* 对齐图标中心 */
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: #e5e5e5;
    z-index: 0;
  }
  .tree-line:last-child::before {
    height: 16px; /* 最后一项只连到一半 */
  }
  
  /* 子节点水平连接线 */
  .tree-branch {
    position: relative;
  }
  .tree-branch::after {
    content: '';
    position: absolute;
    left: -12px; /* 连接到父级垂直线 */
    top: 50%;
    width: 12px;
    height: 1px;
    background-color: #e5e5e5;
  }
`

export default function WikiIndexPage() {
  const router = useRouter()
  
  const [treeData, setTreeData] = useState<WikiCategory[]>([])
  const [tags, setTags] = useState<WikiTag[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // 在桌面端默认打开侧边栏
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true)
      }
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Initial Fetch (Unchanged)
  useEffect(() => {
    const init = async () => {
      const [cats, tgs] = await Promise.all([
        WikiService.getCategories(),
        WikiService.getTags()
      ])
      setTreeData(cats)
      setTags(tgs)
      
      const allIds = new Set<string>()
      cats.forEach(c => allIds.add(c.id))
      setExpandedNodes(allIds)
    }
    init()
  }, [])

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(expandedNodes)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedNodes(newSet)
  }

  // --- 递归渲染树 (优化版：增加连接线视觉) ---
  const renderTree = (nodes: WikiCategory[], level = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0
      const isExpanded = expandedNodes.has(node.id)
      
      return (
        <div key={node.id} className={`relative ${level > 0 ? 'ml-6 tree-line' : 'mb-1'}`}>
          {/* Node Item */}
          <div 
             className={`group flex items-center w-full text-sm py-1.5 px-2 rounded-md transition-all duration-200 cursor-pointer relative z-10 
             ${level > 0 ? 'tree-branch' : ''}
             hover:bg-stone-200/50 text-stone-600 hover:text-stone-900`}
             onClick={() => {
               router.push(`/library/wiki/${node.slug}`)
               if (window.innerWidth < 1024) {
                 setIsSidebarOpen(false)
               }
             }}
          >
             {/* Icon / Expander */}
             <div 
               className="mr-2 shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-stone-300/50 transition-colors"
               onClick={(e) => hasChildren && toggleNode(node.id, e)}
             >
                {hasChildren ? (
                  <ChevronRight 
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                ) : (
                  <Circle className="w-1.5 h-1.5 text-stone-300 fill-stone-300" />
                )}
             </div>

             <span className={`font-medium ${level === 0 ? 'font-serif text-base' : 'text-sm'}`}>
                {node.name}
             </span>
          </div>
          
          {/* Recursive Children */}
          {isExpanded && hasChildren && (
            <div className="">
               {renderTree(node.children ?? [], level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  // Group Categories (Unchanged logic)
  const foundationCats = treeData.filter(c => c.type === 'foundation')
  const schoolCats = treeData.filter(c => c.type === 'school')
  const otherCats = treeData.filter(c => c.type !== 'foundation' && c.type !== 'school')

  return (
    <>
      <style jsx global>{styles}</style>
      
      <div className="flex flex-col h-screen paper-texture text-stone-800">
        
        {/* 1. Header: 悬浮磨砂 */}
        <header className="flex-none h-14 border-b border-stone-200/50 bg-[#F9F7F2]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300">
           <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-stone-500 hover:text-stone-900" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                 <Menu className="w-5 h-5" />
              </Button>
              
              <Breadcrumb>
                <BreadcrumbList className="text-sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/library" className="font-serif hover:text-[#C82E31] transition-colors">藏经阁</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-stone-300" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-bold text-stone-800 font-serif flex items-center gap-2">
                       <Network className="w-3.5 h-3.5 text-[#C82E31]" />
                       知识图谱
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
           </div>

           <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="sm" className="h-8 text-stone-400 hover:text-stone-800 font-serif hover:bg-stone-100 text-xs sm:text-sm">
                 <Share2 className="w-3.5 h-3.5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">分享图谱</span>
              </Button>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
           
           {/* Mobile Overlay */}
           {isSidebarOpen && (
             <div 
               className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
               onClick={() => setIsSidebarOpen(false)}
             />
           )}

           {/* 2. Left Sidebar: 极简目录索引 */}
           <aside 
             className={`w-72 border-r border-stone-200/50 flex flex-col transition-transform duration-300 ease-in-out fixed lg:static h-full z-30 lg:translate-x-0 bg-[#F9F7F2] lg:bg-transparent ${isSidebarOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full'}`}
           >
              <ScrollArea className="flex-1 py-4 sm:py-6 pl-4 sm:pl-6 pr-3 sm:pr-4">
                 <div className="space-y-6 sm:space-y-8 pb-10">
                    
                    {/* Section 1 */}
                    {foundationCats.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                            <Layout className="w-3 h-3" /> 易学通识
                        </h3>
                        <div className="pl-1">
                            {renderTree(foundationCats)}
                        </div>
                      </div>
                    )}

                    {/* Section 2 */}
                    {schoolCats.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                            <GitBranch className="w-3 h-3" /> 分门别类
                        </h3>
                        <div className="pl-1">
                            {renderTree(schoolCats)}
                        </div>
                      </div>
                    )}

                    {/* Section 3 (Tags) - Styled as Stamps */}
                    {tags.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
                         <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                            <Hash className="w-3 h-3" /> 分类占验
                         </h3>
                         <div className="flex flex-wrap gap-2 px-2">
                            {tags.map(tag => (
                              <Badge 
                                key={tag.id} 
                                variant="outline"
                                className="cursor-pointer bg-white/50 border-stone-200 text-stone-500 hover:border-[#C82E31] hover:text-[#C82E31] hover:bg-white transition-all font-serif font-normal px-2 sm:px-2.5 py-0.5 text-xs"
                                onClick={() => {
                                  router.push(`/library/wiki/${tag.slug}`)
                                  if (window.innerWidth < 1024) {
                                    setIsSidebarOpen(false)
                                  }
                                }}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                         </div>
                      </div>
                    )}
                    
                    {otherCats.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 px-2">其他</h3>
                        <div className="pl-1">
                            {renderTree(otherCats)}
                        </div>
                      </div>
                    )}

                 </div>
              </ScrollArea>
           </aside>

           {/* 3. Main Content: 沉浸式导览台 */}
           <main 
             className="flex-1 overflow-y-auto scroll-smooth relative w-full lg:w-auto"
           >
              {/* 背景装饰：大水印 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                  <Network className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] text-stone-800" />
              </div>

              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 lg:py-20 flex flex-col items-center justify-center min-h-[80%]">
                 
                 <div className="text-center w-full max-w-2xl space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-700 ease-out">
                    
                    {/* Hero Title */}
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center p-2 sm:p-3 bg-stone-100/50 rounded-full mb-2 shadow-sm">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#C82E31]" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-stone-800 tracking-tight px-2 sm:px-0">
                            易学知识图谱
                        </h1>
                        <p className="text-stone-500 text-base sm:text-lg font-serif italic px-2 sm:px-0">
                            “ 探赜索隐，钩深致远 ”
                        </p>
                    </div>

                    {/* Big Search Bar */}
                    <div className="relative max-w-xl mx-auto w-full group px-2 sm:px-0">
                        <div className="absolute inset-0 bg-[#C82E31]/5 rounded-full blur-xl group-hover:bg-[#C82E31]/10 transition-all duration-500" />
                        <div className="relative">
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-stone-400 group-focus-within:text-[#C82E31] transition-colors" />
                            <Input 
                                placeholder="搜索知识点、卦例、技法..." 
                                className="h-12 sm:h-14 pl-10 sm:pl-12 pr-16 sm:pr-20 bg-white/80 backdrop-blur-sm border-stone-200 focus-visible:ring-[#C82E31]/20 focus-visible:border-[#C82E31] rounded-full shadow-lg shadow-stone-200/50 text-sm sm:text-base transition-all hover:bg-white" 
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 bg-stone-100 rounded-full text-[10px] sm:text-xs text-stone-400 font-medium border border-stone-200 hidden sm:block">
                                ⌘ K
                            </div>
                        </div>
                    </div>
                    
                    {/* Navigation Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full pt-6 sm:pt-8 px-2 sm:px-0">
                        {/* Card 1 */}
                        <div className="group relative p-4 sm:p-6 bg-white border border-stone-200 rounded-xl hover:border-[#C82E31]/30 hover:shadow-[0_8px_30px_rgba(200,46,49,0.06)] transition-all duration-300 cursor-pointer overflow-hidden text-left">
                            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity transform group-hover:scale-110 duration-500">
                                <Layout className="w-16 h-16 sm:w-24 sm:h-24" />
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#C82E31] group-hover:text-white transition-colors duration-300">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold font-serif text-stone-800 mb-2 group-hover:text-[#C82E31] transition-colors">易学通识</h3>
                            <p className="text-xs text-stone-500 leading-relaxed">
                                公共底层理论库。<br/>涵盖阴阳、五行、干支基础，避免重复造轮子。
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="group relative p-4 sm:p-6 bg-white border border-stone-200 rounded-xl hover:border-[#C82E31]/30 hover:shadow-[0_8px_30px_rgba(200,46,49,0.06)] transition-all duration-300 cursor-pointer overflow-hidden text-left">
                            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity transform group-hover:scale-110 duration-500">
                                <GitBranch className="w-16 h-16 sm:w-24 sm:h-24" />
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#C82E31] group-hover:text-white transition-colors duration-300">
                                <Compass className="w-5 h-5" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold font-serif text-stone-800 mb-2 group-hover:text-[#C82E31] transition-colors">分门别类</h3>
                            <p className="text-xs text-stone-500 leading-relaxed">
                                独立流派体系。<br/>构建六爻、奇门、八字等标准化扩展接口。
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="group relative p-4 sm:p-6 bg-white border border-stone-200 rounded-xl hover:border-[#C82E31]/30 hover:shadow-[0_8px_30px_rgba(200,46,49,0.06)] transition-all duration-300 cursor-pointer overflow-hidden text-left">
                            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity transform group-hover:scale-110 duration-500">
                                <Hash className="w-16 h-16 sm:w-24 sm:h-24" />
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#C82E31] group-hover:text-white transition-colors duration-300">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold font-serif text-stone-800 mb-2 group-hover:text-[#C82E31] transition-colors">分类占验</h3>
                            <p className="text-xs text-stone-500 leading-relaxed">
                                实战案例库。<br/>基于标签系统的场景化应用，跨流派检索。
                            </p>
                        </div>
                    </div>

                 </div>
              </div>
           </main>
        </div>
      </div>
    </>
  )
}