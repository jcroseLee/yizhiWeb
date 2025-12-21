'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Badge } from '@/lib/components/ui/badge'
import { type Note } from '@/lib/services/profile'

export interface NoteCardProps {
  note: Note
}

export const NoteCard = ({ note }: NoteCardProps) => {
  const router = useRouter()
  
  return (
    <Card 
      className="bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-none shadow-sm group"
      onClick={() => router.push(`/6yao/${note.id}`)}
    >
      <CardContent className="p-6 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#2C3E50] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg" />
        <h3 className="text-lg font-bold text-[#2C3E50] mb-2 line-clamp-1 font-serif group-hover:text-[#C0392B] transition-colors">
          {note.title}
        </h3>
        {note.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-3 leading-relaxed">
            {note.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
          <span className="text-xs text-gray-400 font-mono">
            {new Date(note.created_at).toLocaleDateString('zh-CN')}
          </span>
          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500">
            公开
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

