'use client'

import { Coins } from 'lucide-react'

import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'

interface CoinRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CoinRulesDialog({ open, onOpenChange }: CoinRulesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            易币规则说明
          </DialogTitle>
          <DialogDescription>了解如何获得和使用易币</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* 什么是易币 */}
          <div>
            <h4 className="text-base font-bold text-stone-800 mb-2">什么是易币？</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              易币是平台内的虚拟货币，可用于参与社区活动、获取高级功能等。通过完成日常任务和参与社区互动可以获得易币。
            </p>
          </div>

          {/* 如何获得易币 */}
          <div>
            <h4 className="text-base font-bold text-stone-800 mb-3">如何获得易币？</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-700">1</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">每日签到</div>
                  <div className="text-xs text-stone-600">每天首次签到可获得易币奖励，连续签到有额外奖励</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-700">2</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">发布内容</div>
                  <div className="text-xs text-stone-600">发布帖子、排盘记录等优质内容可获得易币奖励</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-700">3</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">参与互动</div>
                  <div className="text-xs text-stone-600">评论、点赞、帮助他人等互动行为可获得易币</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-700">4</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">完成任务</div>
                  <div className="text-xs text-stone-600">完成平台任务、参与活动可获得易币奖励</div>
                </div>
              </div>
            </div>
          </div>

          {/* 易币用途 */}
          <div>
            <h4 className="text-base font-bold text-stone-800 mb-3">易币用途</h4>
            <ul className="space-y-2 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>参与社区悬赏问答</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>解锁高级功能和服务</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>兑换平台权益和礼品</span>
              </li>
            </ul>
          </div>

          {/* 注意事项 */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-sm font-semibold text-amber-800 mb-2">注意事项</h4>
            <ul className="space-y-1 text-xs text-amber-700">
              <li>• 易币不可转让或提现</li>
              <li>• 易币余额长期有效，不会过期</li>
              <li>• 请遵守平台规则，违规行为可能导致易币扣除</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>我知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

