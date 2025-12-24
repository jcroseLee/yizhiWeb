'use client'

import {
    Book,
    CheckCircle2,
    ChevronRight,
    History,
    Library,
    MoreHorizontal,
    Search,
    SortAsc
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/lib/components/ui/select'
import { Separator } from '@/lib/components/ui/separator'

// 模拟书籍数据
const BOOKS = [
  {
    id: 1,
    title: '增删卜易',
    author: '野鹤老人',
    dynasty: '清',
    category: '六爻',
    status: '精校版',
    progress: 85,
    color: 'bg-[#F0F0ED]',
  },
  {
    id: 2,
    title: '卜筮正宗',
    author: '王洪绪',
    dynasty: '清',
    category: '六爻',
    status: '全本',
    progress: 12,
    color: 'bg-[#EDEFEF]',
  },
  {
    id: 3,
    title: '三命通会',
    author: '万民英',
    dynasty: '明',
    category: '四柱',
    status: '精校版',
    progress: 0,
    color: 'bg-[#F2EFE9]',
  },
  {
    id: 4,
    title: '滴天髓',
    author: '京图',
    dynasty: '宋',
    category: '四柱',
    status: '全本',
    progress: 0,
    color: 'bg-[#F0F0ED]',
  },
  {
    id: 5,
    title: '穷通宝鉴',
    author: '余春台',
    dynasty: '清',
    category: '四柱',
    status: '残卷',
    progress: 0,
    color: 'bg-[#EBEBEB]',
  },
  {
    id: 6,
    title: '葬书',
    author: '郭璞',
    dynasty: '晋',
    category: '风水',
    status: '拓本',
    progress: 45,
    color: 'bg-[#EFEDEA]',
  },
  {
    id: 7,
    title: '撼龙经',
    author: '杨筠松',
    dynasty: '唐',
    category: '风水',
    status: '全本',
    progress: 0,
    color: 'bg-[#F0F0ED]',
  },
  {
    id: 8,
    title: '麻衣神相',
    author: '麻衣道者',
    dynasty: '宋',
    category: '相术',
    status: '图解',
    progress: 0,
    color: 'bg-[#EFEFEF]',
  },
  {
    id: 9,
    title: '渊海子平',
    author: '徐子平',
    dynasty: '宋',
    category: '四柱',
    status: '精校版',
    progress: 5,
    color: 'bg-[#F2EFE9]',
  },
  {
    id: 10,
    title: '千里命稿',
    author: '韦千里',
    dynasty: '民国',
    category: '四柱',
    status: '现代',
    progress: 0,
    color: 'bg-[#FFFFFF]',
  },
  {
    id: 11,
    title: '梅花易数',
    author: '邵康节',
    dynasty: '宋',
    category: '推演',
    status: '全本',
    progress: 0,
    color: 'bg-[#F0F0ED]',
  },
  {
    id: 12,
    title: '皇极经世',
    author: '邵康节',
    dynasty: '宋',
    category: '理气',
    status: '精校版',
    progress: 0,
    color: 'bg-[#EBEBEB]',
  },
]

const CATEGORIES = [
  { name: '全部藏书', count: 128 },
  { name: '六爻预测', count: 24 },
  { name: '四柱命理', count: 45 },
  { name: '风水堪舆', count: 18 },
  { name: '奇门遁甲', count: 12 },
  { name: '梅花易数', count: 9 },
  { name: '紫微斗数', count: 15 },
  { name: '相术/面相', count: 5 },
]

const DYNASTIES = ['先秦', '汉唐', '宋元', '明清', '民国', '现代']

export default function AllBooksPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('全部藏书')
  const [searchQuery, setSearchQuery] = useState('')

  const handleBookClick = (bookTitle: string) => {
    router.push(`/library/reader/${encodeURIComponent(bookTitle)}`)
  }

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* 1. Header: 简约的顶部栏 */}
      <div className="flex-none px-8 py-6 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-slate-900 -ml-2"
              onClick={() => router.push('/library')}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
              馆藏目录
              <span className="text-sm font-sans font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                128 部
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索书名、作者、朝代..."
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select defaultValue="popular">
              <SelectTrigger className="w-[130px] bg-white">
                <SortAsc className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">最受欢迎</SelectItem>
                <SelectItem value="newest">最新收录</SelectItem>
                <SelectItem value="oldest">年代最久</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Main Content: 双栏布局 */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full h-full flex">
          {/* Left Sidebar: 分类索引 */}
          <div className="w-64 hidden lg:flex flex-col border-r border-slate-200 bg-white/50 h-full overflow-y-auto py-8 pr-6 pl-8">
            <div className="space-y-6">
              {/* 主要分类 */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                  学科分类
                </h3>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.name}
                      variant={activeCategory === cat.name ? 'secondary' : 'ghost'}
                      className={`w-full justify-between font-normal ${
                        activeCategory === cat.name
                          ? 'bg-[#C82E31]/10 text-[#C82E31] font-medium'
                          : 'text-slate-600'
                      }`}
                      onClick={() => setActiveCategory(cat.name)}
                    >
                      <span className="flex items-center">
                        {activeCategory === cat.name && (
                          <Library className="w-3.5 h-3.5 mr-2" />
                        )}
                        {cat.name}
                      </span>
                      <span className="text-xs text-slate-400">{cat.count}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 朝代筛选 */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                  按年代检索
                </h3>
                <div className="flex flex-wrap gap-2 px-2">
                  {DYNASTIES.map((dynasty) => (
                    <Badge
                      key={dynasty}
                      variant="outline"
                      className="cursor-pointer hover:border-slate-400 hover:bg-white text-slate-500 font-normal"
                    >
                      {dynasty}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 我的书架 */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full justify-start text-slate-600 border-dashed border-slate-300"
                >
                  <History className="w-4 h-4 mr-2" />
                  最近阅读
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content: 书籍网格 */}
          <ScrollArea className="flex-1 h-full">
            <div className="p-8 pb-20">
              {/* 顶部标签栏 (Mobile Filter Placeholder) */}
              <div className="flex items-center gap-2 mb-6 lg:hidden overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.name}
                    variant={activeCategory === cat.name ? 'default' : 'secondary'}
                    className="whitespace-nowrap"
                    onClick={() => setActiveCategory(cat.name)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-10">
                {BOOKS.map((book) => (
                  <div key={book.id} className="group relative flex flex-col items-center">
                    {/* 书籍拟物化主体 */}
                    <div
                      className="relative w-full aspect-[2/3] cursor-pointer transition-all duration-300 group-hover:-translate-y-2"
                      onClick={() => handleBookClick(book.title)}
                    >
                      {/* 阴影层 - Hover时加深 */}
                      <div className="absolute top-2 left-2 w-full h-full bg-slate-200 rounded-sm -z-10 transition-all duration-300 group-hover:top-3 group-hover:left-3 group-hover:bg-slate-300" />

                      {/* 封面主体 */}
                      <div
                        className={`${book.color} w-full h-full rounded-sm border border-stone-200/60 shadow-sm overflow-hidden relative flex flex-col`}
                      >
                        {/* 左侧装订区 */}
                        <div className="absolute left-0 top-0 bottom-0 w-[14px] bg-black/5 border-r border-black/5 z-10 flex flex-col justify-around py-4 items-center">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-full h-[1px] bg-stone-400/40" />
                          ))}
                        </div>

                        {/* 状态徽章 */}
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none"
                          >
                            {book.status}
                          </Badge>
                        </div>

                        {/* 封面内容 */}
                        <div className="flex-1 flex items-center justify-center pl-4">
                          <div className="bg-white/50 border border-stone-800/20 px-3 py-6 min-h-[60%] flex items-center justify-center shadow-inner">
                            <h3
                              className="font-serif text-lg md:text-xl font-bold text-slate-900 tracking-[0.2em] leading-relaxed"
                              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                            >
                              {book.title}
                            </h3>
                          </div>
                        </div>

                        {/* 底部朝代/作者 (封面内) */}
                        <div className="absolute bottom-3 right-3 text-[10px] text-stone-500 font-serif flex flex-col items-end gap-0.5 opacity-60">
                          <span>{book.dynasty}</span>
                          <span>{book.author}</span>
                        </div>
                      </div>

                      {/* Hover Overlay: 快速操作 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pl-4">
                        <Button
                          size="sm"
                          className="bg-[#C82E31] text-white hover:bg-[#a61b1f] shadow-lg scale-90 group-hover:scale-100 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBookClick(book.title)
                          }}
                        >
                          立即阅读
                        </Button>
                      </div>
                    </div>

                    {/* 底部信息 (Metadata) */}
                    <div className="mt-4 w-full px-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm truncate">
                            {book.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {book.author} · {book.dynasty}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-300 hover:text-slate-600"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* 阅读进度条 (如果有) */}
                      {book.progress > 0 && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C82E31] rounded-full"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#C82E31] font-medium">
                            {book.progress}%
                          </span>
                        </div>
                      )}

                      {/* 已读完标记 */}
                      {book.progress === 100 && (
                        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 已读完
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 模拟上传新书的空位 (Optional) */}
                <div className="flex flex-col items-center justify-start pt-[30%] border-2 border-dashed border-slate-200 rounded-sm aspect-[2/3] hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all mb-3">
                    <Book className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">申请收录</span>
                  <span className="text-xs text-slate-400 mt-1">上传 PDF / 图片</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
