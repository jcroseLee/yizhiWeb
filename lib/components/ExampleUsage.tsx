'use client'

import { Button } from '@/lib/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { Select } from '@/lib/components/ui/select'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/lib/components/ui/drawer'
import { useDivinationStore } from '@/lib/stores/divinationStore'
import { formatDateTime } from '@/lib/utils/date'
import { BookOpen, Calendar, Sparkles } from 'lucide-react'
import { useState } from 'react'

/**
 * 示例组件：展示如何使用新中式主题的 shadcn/ui 组件
 */
export function ExampleUsage() {
  const [open, setOpen] = useState(false)
  const { question, setQuestion, history } = useDivinationStore()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            新中式主题示例
          </CardTitle>
          <CardDescription>
            展示 shadcn/ui 组件在新中式学术风主题下的使用
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">事项内容</Label>
            <Input
              id="question"
              placeholder="请输入事项..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">起卦方式</Label>
            <Select id="method" defaultValue="0">
              <option value="0">自动起卦</option>
              <option value="1">手动起卦</option>
              <option value="2">时间起卦</option>
            </Select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button>默认按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="destructive">强调按钮（朱砂红）</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="link">链接按钮</Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm">小按钮</Button>
            <Button size="default">默认按钮</Button>
            <Button size="lg">大按钮</Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            历史记录: {history.length} 条
          </div>
          <Button onClick={() => setOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            打开抽屉
          </Button>
        </CardFooter>
      </Card>

      {/* 移动端抽屉示例 */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              排盘详情
            </DrawerTitle>
            <DrawerDescription>
              当前时间: {formatDateTime(new Date())}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              这是移动端抽屉组件的示例。在移动设备上，点击按钮会从底部弹出。
            </p>
          </div>
          <DrawerFooter>
            <Button onClick={() => setOpen(false)}>关闭</Button>
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 色彩展示 */}
      <Card>
        <CardHeader>
          <CardTitle>新中式色板</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-16 rounded-md bg-paper-50 border"></div>
              <p className="text-xs text-muted-foreground">宣纸白</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-md bg-paper-100 border"></div>
              <p className="text-xs text-muted-foreground">浅米色</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-md bg-ink-800"></div>
              <p className="text-xs text-muted-foreground text-white">墨蓝</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-md bg-cinnabar-500"></div>
              <p className="text-xs text-muted-foreground text-white">朱砂红</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

