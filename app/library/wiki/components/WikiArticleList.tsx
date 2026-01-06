import { Badge } from '@/lib/components/ui/badge'
import { Card } from '@/lib/components/ui/card'
import { FileText } from 'lucide-react'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  slug: string
  summary?: string
  category_name?: string
}

interface WikiArticleListProps {
  title: string
  description?: string
  type: 'category' | 'tag'
  articles: Article[]
}

export function WikiArticleList({ title, description, type, articles }: WikiArticleListProps) {
  return (
    <div>
      <div className="mb-8 border-b border-slate-100 pb-6">
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 mb-4">
          {type === 'category' ? '分类目录' : '场景标签'}
        </Badge>
        <h1 className="text-4xl font-bold font-serif text-slate-900 mb-4 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-slate-600 leading-relaxed font-serif italic">
            "{description}"
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.length > 0 ? articles.map(article => (
          <Link href={`/library/wiki/${article.slug}`} key={article.id} className="block group">
            <Card 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-slate-50/50 h-full"
            >
              <div className="flex justify-between items-start mb-2">
                {article.category_name ? (
                  <Badge variant="outline" className="bg-white text-blue-600 border-blue-200">{article.category_name}</Badge>
                ) : (
                  <FileText className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">{article.title}</h4>
              <p className="text-xs text-slate-500">点击阅读详情</p>
            </Card>
          </Link>
        )) : (
          <p className="text-slate-500">暂无文章</p>
        )}
      </div>
    </div>
  )
}
