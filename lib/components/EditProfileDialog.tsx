'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { updateUserProfile, uploadAvatar, type UserProfile } from '@/lib/services/profile'
import { useAlert } from '@/lib/utils/alert'
import { Camera, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile | null
  onUpdate: () => void
}

export function EditProfileDialog({ open, onOpenChange, profile, onUpdate }: EditProfileDialogProps) {
  const [nickname, setNickname] = useState('')
  const [motto, setMotto] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { alert } = useAlert()

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setMotto(profile.motto || '')
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型，请上传 JPEG、PNG、WebP 或 GIF 格式的图片')
      return
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert('文件大小不能超过 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(file)
      if (url) {
        setAvatarUrl(url)
        // 立即更新头像URL到数据库
        await updateUserProfile({ avatar_url: url })
        onUpdate()
      } else {
        alert('上传失败，请重试')
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      alert(error.message || '上传失败，请重试')
    } finally {
      setUploadingAvatar(false)
      // 重置文件输入，允许选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const success = await updateUserProfile({
        nickname: nickname.trim() || undefined,
        motto: motto.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      })

      if (success) {
        onUpdate()
        onOpenChange(false)
      } else {
        alert('更新失败，请重试')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('更新失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle>编辑资料</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 头像上传 */}
          <div className="flex flex-col items-center space-y-2">
            <Label>头像</Label>
            <div className="relative">
              <Avatar className="w-20 h-20 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={avatarUrl || undefined} alt="头像" />
                <AvatarFallback className="bg-gray-200 text-gray-500">
                  {nickname?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-[#C0392B] rounded-full p-1.5 cursor-pointer hover:bg-[#A93226] transition-colors">
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              支持 JPEG、PNG、WebP、GIF 格式，最大 5MB
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motto">个人格言</Label>
            <Input
              id="motto"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="请输入个人格言"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || uploadingAvatar}>
            取消
          </Button>
          <Button variant="default" onClick={handleSave} disabled={loading || uploadingAvatar}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

