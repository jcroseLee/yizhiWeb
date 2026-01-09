'use client'

import { Badge } from '@/lib/components/ui/badge'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { WikiCategory, WikiService, WikiTag } from '@/lib/services/wiki'
import {
  ChevronRight,
  Circle,
  FileText,
  GitBranch,
  Hash,
  Layout,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const findPath = (nodes: WikiCategory[], targetSlug: string, currentPath: string[], results: Set<string>): boolean => {
  for (const node of nodes) {
    // Match Category
    if (node.slug === targetSlug) {
       currentPath.forEach(id => results.add(id))
       results.add(node.id) 
       return true
    }
    
    // Match Article
    if (node.articles) {
        const foundArticle = node.articles.find(a => a.slug === targetSlug)
        if (foundArticle) {
            currentPath.forEach(id => results.add(id))
            results.add(node.id)
            return true
        }
    }

    // Recurse
    if (node.children && node.children.length > 0) {
       if (findPath(node.children, targetSlug, [...currentPath, node.id], results)) {
          return true
       }
    }
  }
  return false
}

export function WikiSidebar({ 
    className, 
    initialCategories = [], 
    initialTags = [] 
}: { 
    className?: string
    initialCategories?: WikiCategory[]
    initialTags?: WikiTag[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [fetchedCategories, setFetchedCategories] = useState<WikiCategory[]>([])
  const [fetchedTags, setFetchedTags] = useState<WikiTag[]>([])
  
  // Use props if provided, otherwise fallback to fetched data
  const treeData = initialCategories.length > 0 ? initialCategories : fetchedCategories
  const tags = initialTags.length > 0 ? initialTags : fetchedTags

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const allIds = new Set<string>()
    if (initialCategories.length > 0) {
        initialCategories.forEach(c => allIds.add(c.id))
    }
    return allIds
  })

  // Initial Fetch if not provided
  useEffect(() => {
    if (initialCategories.length === 0) {
        const init = async () => {
        const [cats, tgs] = await Promise.all([
            WikiService.getCategories(),
            WikiService.getTags()
        ])
        setFetchedCategories(cats)
        setFetchedTags(tgs)
        
        // Expand all top-level nodes by default
        const allIds = new Set<string>()
        cats.forEach(c => allIds.add(c.id))
        setExpandedNodes(allIds)
        }
        init()
    }
  }, [initialCategories.length])

  // Auto-expand based on current path
  useEffect(() => {
    if (!pathname || treeData.length === 0) return
    
    const slug = pathname.split('/').pop()
    if (!slug) return

    const idsToExpand = new Set<string>()
    findPath(treeData, slug, [], idsToExpand)
    
    if (idsToExpand.size > 0) {
       // Use setTimeout to avoid synchronous state update warning and potential cascading renders
       const timer = setTimeout(() => {
         setExpandedNodes(prev => {
            let missing = false
            for (const id of idsToExpand) {
               if (!prev.has(id)) {
                   missing = true
                   break
               }
            }
            if (!missing) return prev
            
            const next = new Set(prev)
            idsToExpand.forEach(id => next.add(id))
            return next
         })
       }, 0)
       return () => clearTimeout(timer)
    }
  }, [pathname, treeData])

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

  // --- 递归渲染树 (与首页样式一致) ---
  const renderTree = (nodes: WikiCategory[], level = 0) => {
    return nodes.map((node, index) => {
      const hasChildren = (node.children && node.children.length > 0) || (node.articles && node.articles.length > 0)
      const isExpanded = expandedNodes.has(node.id)
      const currentSlug = pathname ? pathname.split('/').pop() : ''
      const isActive = node.slug === currentSlug
      
      return (
        <div key={node.id} className={`relative ${level > 0 ? 'ml-6 tree-line' : 'mb-1'}`}>
          {/* Node Item */}
          <div 
             className={`group flex items-center w-full text-sm py-1.5 px-2 rounded-md transition-all duration-200 cursor-pointer relative z-10 
             ${level > 0 ? 'tree-branch' : ''}
             ${isActive ? 'bg-stone-200/50 text-stone-900' : 'hover:bg-stone-200/50 text-stone-600 hover:text-stone-900'}`}
             onClick={() => router.push(`/library/wiki/${node.slug}`)}
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
               {/* Subcategories */}
               {node.children && node.children.length > 0 && renderTree(node.children, level + 1)}
               
               {/* Articles */}
               {node.articles && node.articles.map((article, artIndex) => {
                  const isArticleActive = article.slug === currentSlug
                  const totalSiblings = (node.children?.length || 0) + (node.articles?.length || 0)
                  const isLastItem = artIndex === (node.articles?.length || 0) - 1 && 
                                    (!node.children || node.children.length === 0)
                  
                  return (
                    <div 
                      key={article.id} 
                      className={`relative ml-6 tree-line ${isLastItem ? '' : ''}`}
                    >
                      <div 
                        className={`group flex items-center w-full text-sm py-1.5 px-2 rounded-md transition-all duration-200 cursor-pointer relative z-10 tree-branch
                        ${isArticleActive ? 'bg-stone-200/50 text-stone-900' : 'hover:bg-stone-200/50 text-stone-600 hover:text-stone-900'}`}
                        onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/library/wiki/${article.slug}`)
                        }}
                      >
                        <div className="mr-2 shrink-0 w-5 h-5 flex items-center justify-center">
                          <Circle className="w-1.5 h-1.5 text-stone-300 fill-stone-300" />
                        </div>
                        <span className="text-sm truncate text-left">{article.title}</span>
                      </div>
                    </div>
                  )
               })}
            </div>
          )}
        </div>
      )
    })
  }

  // Group Categories
  const foundationCats = treeData.filter(c => c.type === 'foundation')
  const schoolCats = treeData.filter(c => c.type === 'school')
  const otherCats = treeData.filter(c => c.type !== 'foundation' && c.type !== 'school')

  return (
    <aside className={`w-72 bg-transparent border-r border-stone-200/50 flex flex-col ${className}`}>
        <ScrollArea className="flex-1 py-6 pl-6 pr-4">
            <div className="space-y-8 pb-10">
                
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
                            className="cursor-pointer bg-white/50 border-stone-200 text-stone-500 hover:border-[#C82E31] hover:text-[#C82E31] hover:bg-white transition-all font-serif font-normal px-2.5 py-0.5"
                            onClick={() => router.push(`/library/wiki/${tag.slug || tag.id}`)}
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
  )
}
