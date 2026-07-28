'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/context/OnboardingContext'
import { createClient } from '@/lib/supabase/client'
import { performWorkspaceCreation } from '@/lib/supabase/createWorkspace'
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react'

// Particle item for Framer Motion confetti burst
interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  rotation: number
  duration: number
}

const CONFETTI_COLORS = ['#003ec7', '#0052ff', '#22C55E', '#FBBC05', '#EA4335', '#9333EA']

export default function StepLoadingSuccess() {
  const router = useRouter()
  const { selectedTemplate, bizName, phone, location, setCreatedWorkspaceId } = useOnboarding()

  // State phases: 'phase1' | 'phase2' | 'phase3' | 'phase4_success' | 'error'
  const [phase, setPhase] = useState<'phase1' | 'phase2' | 'phase3' | 'phase4_success' | 'error'>('phase1')

  const [moduleStates, setModuleStates] = useState<Array<{ id: string; name: string; status: 'neutral' | 'doing' | 'done' }>>([])
  const [creationError, setCreationError] = useState<string | null>(null)
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const isMountedRef = useRef(true)
  const isCreationFinishedRef = useRef(false)
  const createdSlugRef = useRef<string | null>(null)

  // Modules list setup
  const rawModules = selectedTemplate?.modules?.length
    ? selectedTemplate.modules
    : [
        { id: 'm1', name: 'Core Workspace' },
        { id: 'm2', name: 'Member Profiles' },
        { id: 'm3', name: 'Schedule & Booking' },
        { id: 'm4', name: 'Billing & Analytics' },
      ]

  // Particles for Confetti
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    isMountedRef.current = true

    // Generate confetti particles
    const generated: Particle[] = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: (Math.random() - 0.5) * 280,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      duration: Math.random() * 1.2 + 1.4,
    }))
    setParticles(generated)

    // Initial module statuses
    const initialMods = rawModules.map((m) => ({
      id: m.id,
      name: m.name || (m as any).slug || 'Module',
      status: 'neutral' as const,
    }))
    setModuleStates(initialMods)

    // Trigger workspace creation background transaction
    async function startCreation() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('User session not found. Please log in again.')
        }

        const templateToUse = selectedTemplate || {
          id: 'default',
          slug: 'gym',
          name: 'Gym',
          modules: [],
        }

        const wsId = await performWorkspaceCreation(
          supabase,
          templateToUse,
          bizName || 'My Gym Workspace',
          phone || '0000000000',
          location || 'Local',
          user.id
        )

        // Fetch created workspace slug for direct route navigation
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('slug')
          .eq('id', wsId)
          .single()

        const slug = wsData?.slug

        if (!slug) {
          throw new Error('Workspace created but slug not found')
        }

        if (isMountedRef.current) {
          setCreatedWorkspaceId(wsId)
          setWorkspaceSlug(slug)
          createdSlugRef.current = slug
          isCreationFinishedRef.current = true
        }
      } catch (err: any) {
        console.error('Error during workspace creation:', err)
        if (isMountedRef.current) {
          setCreationError(err.message || 'Failed to create workspace')
        }
      }
    }

    startCreation()

    // ----------------------------------------------------
    // Animation Timeline Sequence
    // ----------------------------------------------------
    // Phase 1 (0-800ms)
    const timer1 = setTimeout(() => {
      if (!isMountedRef.current) return
      setPhase('phase2')

      // Phase 2: Stagger module checklist rows over ~2.5s
      const n = initialMods.length
      const totalSpread = 2200

      initialMods.forEach((_, idx) => {
        const showAt = idx === 0 ? 100 : 100 + idx * (totalSpread / Math.max(n - 1, 1))
        const doneAt = showAt + 550

        // Set to doing
        setTimeout(() => {
          if (!isMountedRef.current) return
          setModuleStates((prev) =>
            prev.map((mod, i) => (i === idx ? { ...mod, status: 'doing' } : mod))
          )
        }, showAt)

        // Set to done
        setTimeout(() => {
          if (!isMountedRef.current) return
          setModuleStates((prev) =>
            prev.map((mod, i) => (i === idx ? { ...mod, status: 'done' } : mod))
          )
        }, doneAt)
      })
    }, 800)

    // Phase 3 & 4: Transition to Success view after total ~3.5s
    const timer2 = setTimeout(() => {
      if (!isMountedRef.current) return
      setPhase('phase3')

      setTimeout(() => {
        if (!isMountedRef.current) return
        if (creationError) {
          setPhase('error')
        } else {
          setPhase('phase4_success')
        }
      }, 350)
    }, 3800)

    return () => {
      isMountedRef.current = false
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleGoToDashboard = () => {
    if (!isCreationFinishedRef.current) {
      setIsNavigating(true)
      // Retry after short delay if DB write is still pending
      setTimeout(() => {
        if (createdSlugRef.current) {
          router.push(`/${createdSlugRef.current}`)
        } else {
          window.location.reload()
        }
      }, 1500)
      return
    }

    const targetSlug = workspaceSlug || createdSlugRef.current
    if (targetSlug) {
      router.push(`/${targetSlug}`)
    }
  }

  // Error State Render
  if (phase === 'error' || (creationError && phase === 'phase4_success')) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#191c1e] mb-2">Setup Failed</h3>
        <p className="text-sm text-[#434656] mb-6">
          {creationError || 'An error occurred while creating your workspace. Please try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#003ec7] hover:bg-[#0052ff] text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 min-h-[500px] relative overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Phase 1 & Phase 2 Checklist Animation */}
        {(phase === 'phase1' || phase === 'phase2' || phase === 'phase3') && (
          <motion.div
            key="checklist-phase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase === 'phase3' ? 0 : 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md flex flex-col items-center text-center space-y-6"
          >
            {/* Headline */}
            <motion.div
              animate={{
                y: phase === 'phase2' ? -8 : 0,
                opacity: phase === 'phase2' ? 0.75 : 1,
              }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-bold text-[#191c1e]">
                Creating your workspace…
              </h2>
              <p className="text-sm text-[#434656]">
                Setting up modules for {selectedTemplate?.name || 'Gym'}
              </p>
            </motion.div>

            {/* Checklist items */}
            {phase !== 'phase1' && (
              <div className="w-full space-y-3 pt-2">
                {moduleStates.map((mod) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                      mod.status === 'done'
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#191c1e]'
                        : mod.status === 'doing'
                        ? 'bg-[#0052ff]/10 border-[#0052ff] text-[#003ec7]'
                        : 'bg-white border-[#c3c5d9]/40 text-[#737688]'
                    }`}
                  >
                    <span className="text-sm font-semibold">{mod.name}</span>

                    <div>
                      {mod.status === 'doing' && (
                        <Loader2 className="w-5 h-5 animate-spin text-[#003ec7]" />
                      )}
                      {mod.status === 'done' && (
                        <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                      )}
                      {mod.status === 'neutral' && (
                        <div className="w-4 h-4 rounded-full border-2 border-[#c3c5d9]" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Phase 4: Success View + Confetti Burst */}
        {phase === 'phase4_success' && (
          <motion.div
            key="success-phase"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md flex flex-col items-center text-center space-y-6 z-10"
          >
            {/* Particle Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: p.x,
                    y: p.y + 120,
                    rotate: p.rotation,
                    opacity: 0,
                  }}
                  transition={{
                    duration: p.duration,
                    ease: 'easeOut',
                  }}
                  style={{
                    backgroundColor: p.color,
                    width: p.size,
                    height: p.size,
                    borderRadius: p.id % 2 === 0 ? '50%' : '2px',
                  }}
                  className="absolute"
                />
              ))}
            </div>

            {/* Pop Checkmark Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-20 h-20 bg-[#22C55E] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#22C55E]/30"
            >
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </motion.div>

            {/* Success Heading */}
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-[#191c1e]">You're all set!</h2>
              <p className="text-base text-[#434656] max-w-[300px] mx-auto">
                Your <span className="font-semibold text-[#003ec7]">{bizName || selectedTemplate?.name || 'Workspace'}</span> workspace is ready. Let's get started.
              </p>
            </div>

            {/* Go to Dashboard Action */}
            <div className="w-full pt-4 space-y-3">
              <button
                onClick={handleGoToDashboard}
                className="w-full bg-[#003ec7] hover:bg-[#0052ff] text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Just a moment, finishing setup...</span>
                  </>
                ) : (
                  <>
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
