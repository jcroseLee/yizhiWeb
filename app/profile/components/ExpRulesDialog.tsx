'use client'

import { TrendingUp } from 'lucide-react'

import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'

interface ExpRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpRulesDialog({ open, onOpenChange }: ExpRulesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C82E31]" />
            修业值（经验值）规则说明
          </DialogTitle>
          <DialogDescription>了解如何获得修业值和等级提升</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* 什么是修业值 */}
          <div>
            <h4 className="text-base font-bold text-stone-800 mb-2">什么是修业值？</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              修业值（经验值）是衡量你在易学道路上修行进度的指标。通过完成各种任务和活动可以获得修业值，积累修业值可以提升等级，解锁更多功能和权益。
            </p>
          </div>

          {/* 如何获得修业值 */}
          <div>
            <h4 className="text-base font-bold text-stone-800 mb-3">如何获得修业值？</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-700">1</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">每日签到</div>
                  <div className="text-xs text-stone-600">每天首次签到可获得 +10 修业值，连续签到7天额外获得 +50 修业值</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-700">2</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">浏览内容</div>
                  <div className="text-xs text-stone-600">浏览帖子、排盘记录等内容可获得 +5 修业值</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-700">3</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">点赞互动</div>
                  <div className="text-xs text-stone-600">为他人内容点赞可获得 +2 修业值</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-700">4</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">发布案例</div>
                  <div className="text-xs text-stone-600">发布排盘记录可获得 +20 修业值</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-700">5</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800 mb-1">发表断语</div>
                  <div className="text-xs text-stone-600">在社区发表推演断语可获得 +10 修业值</div>
                </div>
              </div>
            </div>
          </div>

          {/* 等级说明 */}
          <div>
            <h4 className="text-base font-bold text-stone-800 mb-3">等级体系</h4>
            <div className="space-y-2 text-sm text-stone-600">
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.0 游客</strong> - 0 修业值</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.1 初涉易途</strong> - 1 修业值（灰边框）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.2 登堂入室</strong> - 100 修业值（铜边框）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.3 渐入佳境</strong> - 500 修业值（银边框）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.4 触类旁通</strong> - 2000 修业值（银边框+流光）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.5 融会贯通</strong> - 5000 修业值（金边框）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.6 出神入化</strong> - 10000 修业值（金边框+纹饰）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C82E31] mt-1">•</span>
                <span><strong>Lv.7 一代宗师</strong> - 20000 修业值（动态特效边框）</span>
              </div>
            </div>
          </div>

          {/* 注意事项 */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-semibold text-red-800 mb-2">注意事项</h4>
            <ul className="space-y-1 text-xs text-red-700">
              <li>• 修业值不可转让或交易</li>
              <li>• 修业值永久有效，不会过期</li>
              <li>• 等级提升后不可降级</li>
              <li>• 请遵守平台规则，违规行为可能导致修业值扣除</li>
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

