'use client'

import { useEffect, useRef } from 'react'
import { getSession, onAuthStateChange } from '@/lib/services/auth'
import { getUserGrowth } from '@/lib/services/growth'
import { hashUserId, setAnalyticsContext } from '@/lib/analytics'

export function AnalyticsProvider() {
  const lastUserIdRef = useRef<string | null>(null)
  const lastLevelRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      const session = await getSession()
      const userId = session?.user?.id ?? null
      const token = session?.access_token ?? undefined

      if (token) setAnalyticsContext({ session_token: token })

      if (!userId) {
        setAnalyticsContext({ user_id_hash: undefined, user_level: undefined })
        lastUserIdRef.current = null
        lastLevelRef.current = null
        return
      }

      if (userId !== lastUserIdRef.current) {
        const userHash = await hashUserId(userId)
        if (cancelled) return
        setAnalyticsContext({ user_id_hash: userHash })
        lastUserIdRef.current = userId
      }

      const growth = await getUserGrowth()
      if (cancelled) return
      if (growth?.level !== undefined && growth.level !== lastLevelRef.current) {
        setAnalyticsContext({ user_level: growth.level })
        lastLevelRef.current = growth.level
      }
    }

    sync().catch(() => {})

    const unsubscribe = onAuthStateChange(() => {
      sync().catch(() => {})
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return null
}

