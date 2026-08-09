'use client'

import { useEffect, useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import { createClient } from '@/lib/supabase/client'
import {
  Dumbbell,
  Scissors,
  GraduationCap,
  Utensils,
  Briefcase,
  CheckCircle2,
  Loader2,
  LucideIcon,
  ArrowRight,
} from 'lucide-react'
import { SelectedTemplate } from '@/lib/supabase/createWorkspace'

const TMPL_ICON_MAP: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  scissors: Scissors,
  'graduation-cap': GraduationCap,
  utensils: Utensils,
  briefcase: Briefcase,
}

const DEFAULT_TMPL_ICON = Briefcase

interface RawTemplate {
  id: string
  slug: string
  name: string
  description?: string
  icon?: string
  template_modules?: Array<{
    module_id: string
    is_required: boolean
    modules?: {
      id: string
      slug: string
      name: string
    }
  }>
}

export default function StepIndustry() {
  const { selectedTemplate, setSelectedTemplate, nextStep } = useOnboarding()
  const [templates, setTemplates] = useState<SelectedTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('templates')
          .select(
            'id, slug, name, description, icon, template_modules(module_id, is_required, modules(id, slug, name))'
          )
          .eq('is_active', true)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching templates:', error)
          setFetchError(error.message)
        } else if (data && data.length > 0) {
          const parsed: SelectedTemplate[] = (data as any[]).map((t: any) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            icon: t.icon,
            modules: Array.isArray(t.template_modules)
              ? t.template_modules
                  .map((tm: any) => tm.modules)
                  .filter(Boolean)
              : [],
          }))
          setTemplates(parsed)
          // Auto-select first template if none selected yet
          if (!selectedTemplate && parsed.length > 0) {
            setSelectedTemplate(parsed[0])
          }
        }
      } catch (err: any) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const staticComingSoonCards = [
    { title: 'Restaurant', category: 'Food & Dining', icon: Utensils },
    { title: 'Salon', category: 'Hair & Beauty Spas', icon: Scissors },
    { title: 'Coaching Center', category: 'Education & Tutors', icon: GraduationCap },
  ]

  return (
    <div className="flex flex-col gap-8 w-full">
      <div>
        <span className="onb-eyebrow mb-4">
          <span />
          GET STARTED
        </span>
        <h2
          className="text-3xl font-extrabold tracking-tight mt-4 mb-2"
          style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
        >
          Let's get started
        </h2>
        <p className="text-base" style={{ color: 'var(--onb-ink-soft)' }}>
          Tell us about your business.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--onb-muted)' }}>
          Select Industry
        </h3>

        {loading ? (
          <div className="onb-card flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" style={{ color: 'var(--onb-emerald)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--onb-ink-soft)' }}>
              Loading industries...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic Active Templates */}
            {templates.map((tmpl) => {
              const IconComponent = TMPL_ICON_MAP[(tmpl as any).icon || ''] || DEFAULT_TMPL_ICON
              const isSelected = selectedTemplate?.id === tmpl.id

              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className="onb-card relative flex items-center p-4 text-left transition-all duration-200 active:scale-[0.98]"
                  style={
                    isSelected
                      ? { borderColor: 'var(--onb-emerald)', boxShadow: '0 0 0 1px rgba(16,185,129,0.25), 0 20px 50px rgba(0,0,0,0.35)' }
                      : undefined
                  }
                >
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-xl mr-4"
                    style={{ background: 'var(--onb-emerald)', color: '#08080a' }}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: 'var(--onb-ink)' }}>
                      {tmpl.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--onb-ink-soft)' }}>
                      Fitness & Wellness Centers
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--onb-emerald)' }} />
                    </div>
                  )}
                </button>
              )
            })}

            {/* Static Disabled Coming Soon Cards */}
            {staticComingSoonCards.map((card, idx) => {
              const IconComp = card.icon
              return (
                <div
                  key={idx}
                  className="relative flex items-center p-4 rounded-2xl opacity-50 cursor-not-allowed select-none"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--onb-line)' }}
                >
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-xl mr-4"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--onb-muted)' }}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: 'var(--onb-muted)' }}>
                      {card.title}
                    </p>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter mt-1"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--onb-ink-soft)' }}
                    >
                      Coming Soon
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={nextStep} disabled={!selectedTemplate} className="onb-btn-primary">
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
