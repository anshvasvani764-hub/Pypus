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
    <div className="flex-grow flex flex-col justify-between px-4 py-8 max-w-2xl mx-auto w-full">
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#191c1e]">
            Let's get started
          </h2>
          <p className="text-base text-[#434656]">Tell us about your business.</p>
        </div>

        {/* Industry Selection Header */}
        <div className="space-y-4 pt-2">
          <h3 className="text-lg font-semibold text-[#191c1e]">Select Industry</h3>

          {loading ? (
            <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-[#c3c5d9]/40 shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin text-[#003ec7] mr-2" />
              <span className="text-sm font-medium text-[#434656]">Loading industries...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dynamic Active Templates */}
              {templates.map((tmpl) => {
                const IconComponent =
                  TMPL_ICON_MAP[(tmpl as any).icon || ''] || DEFAULT_TMPL_ICON
                const isSelected = selectedTemplate?.id === tmpl.id

                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`relative flex items-center p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? 'bg-white border-[#0052ff] shadow-md'
                        : 'bg-white border-[#c3c5d9]/40 hover:border-[#003ec7]/40 shadow-sm'
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#0052ff] text-white mr-4 shadow-sm">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-[#003ec7]">{tmpl.name}</p>
                      <p className="text-xs text-[#434656]">Fitness & Wellness Centers</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle2 className="w-5 h-5 text-[#003ec7]" />
                      </div>
                    )}
                  </button>
                )
              })}

              {/* Static Disabled Coming Soon Cards matching Stitch Mockup */}
              {staticComingSoonCards.map((card, idx) => {
                const IconComp = card.icon
                return (
                  <div
                    key={idx}
                    className="relative flex items-center p-4 rounded-2xl bg-[#f2f4f6] border border-[#c3c5d9]/40 opacity-60 cursor-not-allowed select-none"
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#e0e3e5] text-[#737688] mr-4">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-[#737688]">{card.title}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e0e3e5] text-[#434656] uppercase tracking-tighter mt-1">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky / Floating Footer Action */}
      <div className="pt-8">
        <button
          onClick={nextStep}
          disabled={!selectedTemplate}
          className="w-full bg-[#003ec7] hover:bg-[#0052ff] text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
