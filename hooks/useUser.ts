'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError) {
        setError(authError)
      } else {
        setUser(data.user)
      }
      setIsLoading(false)
    })
  }, [])

  const displayName = user
    ? user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User'
    : 'User'

  const avatarUrl: string | null = user?.user_metadata?.avatar_url || null

  return { user, displayName, avatarUrl, isLoading, error }
}
