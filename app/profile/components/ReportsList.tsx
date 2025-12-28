'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/lib/components/ui/card'
import { Badge } from '@/lib/components/ui/badge'
import { getMyReports, type Report } from '@/lib/services/reports'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function ReportsList() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const data = await getMyReports({ limit: 50 })
      setReports(data)
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const getReasonLabel = (category: string) => {
    const map: Record<string, string> = {
      compliance: '违法违规',
      superstition: '封建迷信',
      scam: '广告引流',
      attack: '人身攻击',
      spam: '垃圾灌水'
    }
    return map[category] || category
  }

  const getTargetTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      post: '帖子',
      comment: '评论',
      user: '用户'
    }
    return map[type] || type
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'resolved':
        return { label: '已处理', icon: CheckCircle2, color: 'text-green-600 bg-green-50' }
      case 'rejected':
        return { label: '已驳回', icon: XCircle, color: 'text-gray-600 bg-gray-50' }
      default:
        return { label: '待处理', icon: Clock, color: 'text-orange-600 bg-orange-50' }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-stone-400" />
          </div>
        </div>
        <p className="text-stone-400 text-sm">暂无举报记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => {
        const statusInfo = getStatusInfo(report.status)
        const StatusIcon = statusInfo.icon

        return (
          <Card key={report.id} className="overflow-hidden border-stone-200 hover:border-stone-300 transition-colors">
            <CardHeader className="bg-stone-50/50 pb-3 py-3 px-4 border-b border-stone-100">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white">{getTargetTypeLabel(report.target_type)}</Badge>
                  <span className="text-xs text-stone-500">
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: zhCN })}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-stone-500 shrink-0">举报理由:</span>
                  <span className="text-sm font-medium text-stone-900">{getReasonLabel(report.reason_category)}</span>
                </div>
                
                {report.description && (
                  <div className="bg-stone-50 p-3 rounded-md text-sm text-stone-600 leading-relaxed">
                    {report.description}
                  </div>
                )}

                {report.admin_note && (
                  <div className="mt-2 pt-3 border-t border-stone-100">
                    <div className="text-sm font-medium text-stone-900 mb-1">管理员回复:</div>
                    <p className="text-sm text-stone-600">{report.admin_note}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
