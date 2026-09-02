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
  Building,
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
  is_active?: boolean
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

type ParsedTemplate = SelectedTemplate & { icon?: string; is_active: boolean }

export default function StepBusinessDetails() {
  const { bizName, setBizName, selectedTemplate, setSelectedTemplate, nextStep } = useOnboarding()
  const [activeTemplates, setActiveTemplates] = useState<ParsedTemplate[]>([])
  const [comingSoonTemplates, setComingSoonTemplates] = useState<ParsedTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('templates')
          .select(
            'id, slug, name, description, icon, is_active, template_modules(module_id, is_required, modules(id, slug, name))'
          )
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching templates:', error)
          setFetchError(error.message)
        } else if (data && data.length > 0) {
          const parsed: ParsedTemplate[] = (data as any[]).map((t: any) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            icon: t.icon,
            is_active: !!t.is_active,
            modules: Array.isArray(t.template_modules)
              ? t.template_modules.map((tm: any) => tm.modules).filter(Boolean)
              : [],
          }))

          const active = parsed.filter((t) => t.is_active === true)
          const comingSoon = parsed.filter((t) => t.is_active === false)

          setActiveTemplates(active)
          setComingSoonTemplates(comingSoon)

          // Auto-select first active template if none selected yet
          if (!selectedTemplate && active.length > 0) {
            setSelectedTemplate(active[0])
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

  const entityTitle = selectedTemplate?.name ? selectedTemplate.name.toLowerCase() : 'business'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = bizName.trim()
    if (!trimmed) {
      setNameError(`Please enter your ${entityTitle} name`)
      return
    }
    if (!selectedTemplate) return
    setNameError(null)
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      <div>
        <span className="onb-eyebrow mb-4">
          <span />
          GET STARTED
        </span>
        <h2
          className="text-3xl font-extrabold tracking-tight mt-4 mb-2"
          style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
        >
          Tell us about your business
        </h2>
        <p className="text-base" style={{ color: 'var(--onb-ink-soft)' }}>
          This sets up your workspace name and industry template.
        </p>
      </div>

      <div className="onb-card p-6 space-y-5">
        {/* Business Name */}
        <div className="space-y-2">
          <label
            htmlFor="bizName"
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--onb-muted)' }}
          >
            Business Name
          </label>
          <div className="relative">
            <div
              className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              style={{ color: 'var(--onb-muted)' }}
            >
              <Building className="w-5 h-5" />
            </div>
            <input
              id="bizName"
              type="text"
              value={bizName}
              onChange={(e) => {
                setBizName(e.target.value)
                if (nameError) setNameError(null)
              }}
              placeholder="e.g. Iron & Grace Studio"
              autoFocus
              className="onb-input"
              style={{ paddingLeft: 48 }}
            />
          </div>
        </div>

        {/* Industry — compact pill selector */}
        <div className="space-y-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--onb-muted)' }}
          >
            Select Your Industry
          </label>

          {loading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--onb-emerald)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--onb-ink-soft)' }}>
                Loading industries...
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Dynamic Active Templates */}
              {activeTemplates.map((tmpl) => {
                const IconComponent = TMPL_ICON_MAP[tmpl.icon || ''] || DEFAULT_TMPL_ICON
                const isSelected = selectedTemplate?.id === tmpl.id

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl)}
                    className="inline-flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 active:scale-[0.97]"
                    style={
                      isSelected
                        ? {
                            background: 'var(--onb-emerald)',
                            color: '#08080a',
                            boxShadow: '0 0 0 1px rgba(16,185,129,0.35)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.03)',
                            color: 'var(--onb-ink)',
                            border: '1px solid var(--onb-line)',
                          }
                    }
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center rounded-full"
                      style={{
                        background: isSelected ? 'rgba(8,8,10,0.15)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#08080a' : 'var(--onb-emerald)',
                      }}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </span>
                    {tmpl.name}
                  </button>
                )
              })}

              {/* Dynamic Coming Soon Templates */}
              {comingSoonTemplates.map((tmpl) => {
                const IconComp = TMPL_ICON_MAP[tmpl.icon || ''] || DEFAULT_TMPL_ICON
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-sm font-semibold opacity-40 cursor-not-allowed select-none"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--onb-muted)',
                      border: '1px solid var(--onb-line)',
                    }}
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--onb-muted)' }}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </span>
                    {tmpl.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {(nameError || fetchError) && (
          <p
            className="text-xs font-medium p-3 rounded-lg"
            style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            {nameError || fetchError}
          </p>
        )}
      </div>

      <button onClick={handleSubmit} type="submit" disabled={!selectedTemplate} className="onb-btn-primary">
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}