'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Workspace {
  id: string
  name: string
  slug: string
}

export function useWorkspace(slug: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('slug', slug)
      .single()
      .then(({ data, error: queryError }) => {
        if (queryError) {
          setError(queryError)
        } else {
          setWorkspace(data)
        }
        setIsLoading(false)
      })
  }, [slug])

  const workspaceName = workspace?.name || 'Workspace'

  return { workspace, workspaceName, isLoading, error }
}
