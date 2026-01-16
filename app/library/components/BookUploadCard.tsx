'use client'

import { CheckCircle2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/lib/components/ui/button'

type BookUploadCardProps = {
  onFileSelect: (file: File) => Promise<void>
  onUploadClick?: () => void | Promise<void>
}

export function BookUploadCard({ onFileSelect, onUploadClick }: BookUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setUploadError(null)
    setUploadSuccess(false)
    setUploading(true)
    
    try {
      await onFileSelect(file)
      setUploadSuccess(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error: any) {
      setUploadError(error?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleUploadClick = async () => {
    if (onUploadClick) {
      await onUploadClick()
    }
    fileInputRef.current?.click()
  }

  return (
    <div className="relative flex flex-col items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      <div
        onClick={handleUploadClick}
        className={`w-full aspect-[2/3] rounded-[4px] border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${
          uploading
            ? 'border-stone-300 bg-stone-100'
            : uploadSuccess
            ? 'border-green-300 bg-green-50'
            : uploadError
            ? 'border-red-300 bg-red-50'
            : 'border-[#C5A065]/30 hover:border-[#C5A065] hover:bg-[#C5A065]/5 bg-white/30'
        }`}
      >
        {/* Hover Ripple */}
        {!uploading && !uploadSuccess && !uploadError && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-[#C5A065]/10 animate-ping" />
          </div>
        )}

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 shadow-sm ${
            uploading
              ? 'bg-stone-200 text-stone-500'
              : uploadSuccess
              ? 'bg-green-100 text-green-600'
              : uploadError
              ? 'bg-red-100 text-red-600'
              : 'bg-white border border-[#C5A065]/20 text-[#C5A065] group-hover:scale-110 group-hover:shadow-md'
          }`}
        >
          {uploading ? (
            <Upload className="w-4 h-4 animate-pulse" />
          ) : uploadSuccess ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : uploadError ? (
            <X className="w-4 h-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </div>

        <div className="text-center px-2 space-y-0.5 relative z-10">
          {uploading ? (
            <span className="block text-xs text-stone-400">处理中...</span>
          ) : uploadSuccess ? (
            <span className="block text-xs text-green-600">成功</span>
          ) : uploadError ? (
            <span className="block text-[10px] text-red-500 line-clamp-1">失败</span>
          ) : (
            <>
              <span className="block text-xs font-bold font-serif text-stone-700 group-hover:text-[#C5A065] transition-colors">
                申请收录
              </span>
              <span className="block text-[9px] text-stone-600 uppercase tracking-wider group-hover:text-[#C5A065]/60">
                上传 PDF / 图片
              </span>
            </>
          )}
        </div>
      </div>
      {uploadError && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-5 w-5 p-0 hover:bg-red-100 rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            setUploadError(null)
          }}
        >
          <X className="w-3 h-3 text-red-500" />
        </Button>
      )}
    </div>
  )
}
