'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card'
import { Badge } from '@/lib/components/ui/badge'
import { getCurrentUser } from '@/lib/services/auth'
import { getMyReports, type Report } from '@/lib/services/reports'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function MyReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    checkAuthAndLoadReports()
  }, [])

  const checkAuthAndLoadReports = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?redirect=/profile/reports')
      return
    }

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
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">我的举报记录</h1>
      </div>

      {reports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无举报记录</h3>
            <p className="text-gray-500">感谢您共同维护社区环境</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const statusInfo = getStatusInfo(report.status)
            const StatusIcon = statusInfo.icon

            return (
              <Card key={report.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50/50 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getTargetTypeLabel(report.target_type)}</Badge>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: zhCN })}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo.label}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500 mr-2">举报理由:</span>
                      <span className="font-medium text-gray-900">{getReasonLabel(report.reason_category)}</span>
                    </div>
                    
                    {report.description && (
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
                        {report.description}
                      </div>
                    )}

                    {report.admin_note && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="text-sm font-medium text-gray-900 mb-1">管理员回复:</div>
                        <p className="text-sm text-gray-600">{report.admin_note}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
