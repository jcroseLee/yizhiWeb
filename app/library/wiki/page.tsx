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
    ChevronDown,
    Folder,
    Menu,
    Search,
    Share2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function WikiIndexPage() {
  const router = useRouter()
  
  const [treeData, setTreeData] = useState<WikiCategory[]>([])
  const [tags, setTags] = useState<WikiTag[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Initial Fetch
  useEffect(() => {
    const init = async () => {
      const [cats, tgs] = await Promise.all([
        WikiService.getCategories(),
        WikiService.getTags()
      ])
      setTreeData(cats)
      setTags(tgs)
      
      // Expand all top-level nodes by default
      const allIds = new Set<string>()
      cats.forEach(c => allIds.add(c.id))
      setExpandedNodes(allIds)
    }
    init()
  }, [])

  const toggleNode = (id: string) => {
    const newSet = new Set(expandedNodes)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedNodes(newSet)
  }

  const renderTree = (nodes: WikiCategory[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="mb-1">
        <button 
          className={`flex items-center w-full text-sm font-semibold text-slate-900 mb-1 px-2 py-1 hover:bg-slate-100 rounded-md transition-colors ${level > 0 ? 'ml-2' : ''}`}
          onClick={() => {
             if (node.children && node.children.length > 0) {
               toggleNode(node.id)
             }
             router.push(`/library/wiki/${node.slug}`)
          }}
        >
           {node.children && node.children.length > 0 ? (
             <ChevronDown className={`w-4 h-4 mr-1 text-slate-400 transition-transform ${expandedNodes.has(node.id) ? '' : '-rotate-90'}`} />
           ) : (
             <Folder className="w-4 h-4 mr-1 text-slate-400" />
           )}
           <span>{node.name}</span>
        </button>
        
        {expandedNodes.has(node.id) && node.children && node.children.length > 0 && (
          <div className="space-y-0.5 ml-2 border-l border-slate-200 pl-2">
             {renderTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  // Group Categories
  const foundationCats = treeData.filter(c => c.type === 'foundation')
  const schoolCats = treeData.filter(c => c.type === 'school')
  const otherCats = treeData.filter(c => c.type !== 'foundation' && c.type !== 'school')

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      
      {/* 1. Header */}
      <header className="flex-none h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
               <Menu className="w-5 h-5 text-slate-500" />
            </Button>
            
            <Breadcrumb>
              <BreadcrumbList className="text-sm">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/library" className="font-serif">藏经阁</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-slate-900">
                    知识图谱
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
         </div>

         <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-64 mr-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="搜索知识点..." className="h-8 pl-8 bg-slate-50 border-transparent focus:bg-white focus:border-slate-200" />
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-slate-500">
               <Share2 className="w-4 h-4 mr-2" /> 分享
            </Button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         
         {/* 2. Left Sidebar */}
         <aside className={`w-64 bg-[#FAFAFA] border-r border-slate-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute z-20 h-full'} lg:static lg:translate-x-0`}>
            <ScrollArea className="flex-1 py-6 px-4">
               <div className="space-y-6">
                  
                  {/* Layer 1: Foundation */}
                  {foundationCats.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">易学通识 (公共底层)</h3>
                      {renderTree(foundationCats)}
                    </div>
                  )}

                  {/* Layer 2: Schools */}
                  {schoolCats.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">分门别类 (独立流派)</h3>
                      {renderTree(schoolCats)}
                    </div>
                  )}

                  {/* Layer 3: Scenarios (Tags) */}
                  {tags.length > 0 && (
                    <div>
                       <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">分类占验 (实战案例)</h3>
                       <div className="flex flex-wrap gap-2 px-2">
                          {tags.map(tag => (
                            <Badge 
                              key={tag.id} 
                              variant="outline"
                              className="cursor-pointer hover:bg-slate-100"
                              onClick={() => router.push(`/library/wiki/${tag.slug}`)}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                       </div>
                    </div>
                  )}
                  
                  {otherCats.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">其他</h3>
                      {renderTree(otherCats)}
                    </div>
                  )}

               </div>
            </ScrollArea>
         </aside>

         {/* 3. Main Content */}
         <main className="flex-1 overflow-y-auto bg-white scroll-smooth">
            <div className="max-w-4xl mx-auto px-8 py-10 lg:px-12 lg:py-12">
               <div className="text-center py-20">
                 <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">易学知识图谱</h1>
                 <p className="text-slate-500 text-lg mb-8">请选择左侧目录开始探索，或直接搜索感兴趣的知识点</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-blue-600 font-bold mb-2">易学通识</div>
                        <p className="text-sm text-slate-500">公共底层理论，避免重复造轮子</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-blue-600 font-bold mb-2">分门别类</div>
                        <p className="text-sm text-slate-500">独立流派体系，标准化扩展接口</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-blue-600 font-bold mb-2">分类占验</div>
                        <p className="text-sm text-slate-500">场景化实战案例，跨流派应用</p>
                    </div>
                 </div>
               </div>
            </div>
         </main>
      </div>
    </div>
  )
}
