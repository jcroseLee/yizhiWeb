import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/lib/components/ui/breadcrumb"
import { Button } from '@/lib/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
    FileQuestion,
    Hash,
    LayoutGrid,
    Library,
    Share2
} from 'lucide-react'
import Link from 'next/link'
import { WikiArticleContainer } from './WikiArticleContainer'
import { WikiArticleList } from './WikiArticleList'
import { WikiSidebar } from './WikiSidebar'
import { WikiStyles } from './WikiStyles'

// Shared Server Component for Wiki Page Logic
export async function WikiPageContent({ slug }: { slug: string }) {
  // Use admin client to bypass RLS for public wiki content
  let supabase
  try {
    supabase = createSupabaseAdmin()
  } catch (error) {
    console.warn('Failed to create admin client, falling back to anon client:', error)
    supabase = await createClient()
  }
  
  // Fetch Categories for Sidebar (needed for all views)
  const { data: categories } = await supabase
      .from('wiki_categories')
      .select('*')
      .order('sort_order')
  
  // Fetch Articles for Sidebar
  const { data: allArticles } = await supabase
      .from('wiki_articles')
      .select('id, title, slug, category_id, sort_order, status')
      .eq('status', 'published')
      .order('sort_order')

  const buildTree = (cats: any[] | null, arts: any[] | null) => {
      if (!cats) return []
      const map = new Map()
      const roots: any[] = []
      
      // Initialize map
      cats.forEach(c => map.set(c.id, { ...c, children: [], articles: [] }))
      
      // Add articles
      if (arts) {
          arts.forEach(a => {
              if (a.category_id && map.has(a.category_id)) {
                  map.get(a.category_id).articles.push(a)
              }
          })
      }

      // Build hierarchy
      cats.forEach(c => {
          const node = map.get(c.id)
          if (c.parent_id) {
              const parent = map.get(c.parent_id)
              if (parent) parent.children.push(node)
              else roots.push(node)
          } else {
              roots.push(node)
          }
      })
      
      const sortFn = (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
      
      map.forEach(node => {
          if (node.children) node.children.sort(sortFn)
          if (node.articles) node.articles.sort(sortFn)
      })
      
      return roots.sort(sortFn)
  }
  const treeData = buildTree(categories, allArticles)

  // 1. Try to find Article
  const { data: article } = await supabase
    .from('wiki_articles')
    .select('*, wiki_categories(name, slug)')
    .eq('slug', slug)
    .single()

  if (article) {
      // Fetch Related Books
      let relatedBooks = []
      if (article.related_book_ids && article.related_book_ids.length > 0) {
          const { data: books } = await supabase
              .from('library_books')
              .select('*')
              .in('id', article.related_book_ids)
          relatedBooks = books || []
      }

      return (
        <>
            <WikiStyles />
            <div className="flex flex-col h-screen paper-texture text-stone-800">
                {/* Header */}
                <header className="flex-none h-14 border-b border-stone-200/50 bg-[#F9F7F2]/80 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-8 flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <Breadcrumb>
                            <BreadcrumbList className="text-sm">
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/library/wiki" className="font-serif hover:text-[#C82E31] transition-colors flex items-center gap-1">
                                        <Library className="w-3.5 h-3.5" /> 藏经阁
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink 
                                        href={`/library/wiki/${article.wiki_categories?.slug}`} 
                                        className="font-serif hover:text-[#C82E31] transition-colors"
                                    >
                                        {article.wiki_categories?.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-bold text-stone-800 font-serif truncate max-w-[200px]">
                                        {article.title}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 font-serif">
                            <Share2 className="w-3.5 h-3.5 mr-2" /> 分享
                        </Button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Sidebar */}
                    <WikiSidebar 
                        className="hidden lg:flex w-72 border-r border-stone-200/50 bg-transparent" 
                        initialCategories={treeData} 
                    />
                    
                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto scroll-smooth">
                        <WikiArticleContainer article={article} relatedBooks={relatedBooks} />
                    </main>
                </div>
            </div>
        </>
      )
  }

  // 2. Try to find Category
  const { data: category } = await supabase
    .from('wiki_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (category) {
      // Helper to get all descendant category IDs
      const getDescendantIds = (parentId: string, allCats: any[]) => {
          let ids = [parentId]
          const children = allCats.filter(c => c.parent_id === parentId)
          for (const child of children) {
              ids = [...ids, ...getDescendantIds(child.id, allCats)]
          }
          return ids
      }
      
      const targetCategoryIds = getDescendantIds(category.id, categories || [])
 
      const { data: articles } = await supabase
          .from('wiki_articles')
          .select('id, title, slug, summary, category_id, wiki_categories(name)')
          .in('category_id', targetCategoryIds)
          .eq('status', 'published')
          .order('sort_order')
      
      const formattedArticles = (articles || []).map((a: any) => ({
          ...a,
          category_name: a.wiki_categories?.name
      }))

      return (
        <>
            <WikiStyles />
            <div className="flex flex-col h-screen paper-texture text-stone-800">
                <header className="flex-none h-14 border-b border-stone-200/50 bg-[#F9F7F2]/80 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Breadcrumb>
                            <BreadcrumbList className="text-sm">
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/library/wiki" className="font-serif hover:text-[#C82E31] transition-colors flex items-center gap-1">
                                        <Library className="w-3.5 h-3.5" /> 藏经阁
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-bold text-stone-800 font-serif flex items-center gap-2">
                                        <LayoutGrid className="w-3.5 h-3.5 text-[#C82E31]" />
                                        {category.name}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    <WikiSidebar 
                        className="hidden lg:flex w-72 border-r border-stone-200/50 bg-transparent" 
                        initialCategories={treeData} 
                    />
                    <main className="flex-1 overflow-y-auto scroll-smooth">
                        <div className="max-w-4xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
                            <WikiArticleList 
                                title={category.name} 
                                description={category.description} 
                                type="category" 
                                articles={formattedArticles} 
                            />
                        </div>
                    </main>
                </div>
            </div>
        </>
      )
  }

  // 3. Try to find Tag
  const { data: tag } = await supabase
    .from('wiki_tags')
    .select('*')
    .eq('slug', slug)
    .single()

  if (tag) {
     const { data: tagArticles } = await supabase
          .from('wiki_article_tags')
          .select('article_id, wiki_articles(id, title, slug, summary, category_id, wiki_categories(name), status)')
          .eq('tag_id', tag.id)

     const articles = (tagArticles || [])
        .map((item: any) => item.wiki_articles)
        .filter((a: any) => a && (a.status === 'published'))
        .map((a: any) => ({
            ...a,
            category_name: a.wiki_categories?.name
        }))

      return (
        <>
            <WikiStyles />
            <div className="flex flex-col h-screen paper-texture text-stone-800">
                <header className="flex-none h-14 border-b border-stone-200/50 bg-[#F9F7F2]/80 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Breadcrumb>
                            <BreadcrumbList className="text-sm">
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/library/wiki" className="font-serif hover:text-[#C82E31] transition-colors flex items-center gap-1">
                                        <Library className="w-3.5 h-3.5" /> 藏经阁
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-bold text-stone-800 font-serif flex items-center gap-2">
                                        <Hash className="w-3.5 h-3.5 text-[#C82E31]" />
                                        {tag.name}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    <WikiSidebar 
                        className="hidden lg:flex w-72 border-r border-stone-200/50 bg-transparent" 
                        initialCategories={treeData} 
                    />
                    <main className="flex-1 overflow-y-auto scroll-smooth">
                        <div className="max-w-4xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
                            <WikiArticleList 
                                title={tag.name} 
                                type="tag" 
                                articles={articles} 
                            />
                        </div>
                    </main>
                </div>
            </div>
        </>
      )
  }

  // 4. Not Found - 优雅的空状态
  return (
    <>
        <WikiStyles />
        <div className="flex items-center justify-center h-screen paper-texture text-stone-800">
            <div className="text-center max-w-md px-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <FileQuestion className="w-10 h-10 text-stone-400" />
                </div>
                <h1 className="text-2xl font-serif font-bold text-stone-800 mb-3 tracking-wide">
                    卷帙未存
                </h1>
                <p className="text-stone-500 mb-8 leading-relaxed font-serif">
                    “此处空空如也，或许是遗失在时光中的篇章。”
                    <br />
                    <span className="text-sm text-stone-400 mt-2 block">该词条、分类或标签可能已被移除。</span>
                </p>
                <Link href="/library/wiki">
                    <Button className="bg-[#C82E31] hover:bg-[#a61b1f] text-white px-8 h-10 shadow-md shadow-red-900/10 font-serif">
                        返回藏经阁
                    </Button>
                </Link>
            </div>
        </div>
    </>
  )
}