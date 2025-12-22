'use client'

import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'

interface DeletePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  deleting: boolean
}

export function DeletePostDialog({ open, onOpenChange, onConfirm, deleting }: DeletePostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>确认删除帖子</DialogTitle>
          <DialogDescription>此操作不可恢复。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={deleting}
            className="bg-[#C82E31] text-white hover:bg-[#B02629] font-semibold shadow-sm"
          >
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

