'use client'

import { Button } from '@/lib/components/ui/button'
import { getCurrentUser } from '@/lib/services/auth'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ReportsList } from '../components/ReportsList'

export default function MyReportsPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?redirect=/profile/reports')
        return
      }
      if (!cancelled) setCheckingAuth(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (checkingAuth) {
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

      <ReportsList />
    </div>
  )
}
