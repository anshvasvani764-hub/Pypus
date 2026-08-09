'use client'

import { useOnboarding } from '@/context/OnboardingContext'
import { Lock, ArrowRight } from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹499',
    period: 'Coming soon',
    features: ['All 5 automations', 'Limited logins', 'Basic support'],
    cta: 'Start free trial',
    locked: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'MOST PICKED',
    price: '₹999',
    period: 'Access to every feature',
    features: ['Access to every feature', '24/7 support', 'One branch / franchise allowed'],
    cta: 'Start 14-day free trial',
    locked: false,
    featured: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '₹3,999',
    period: 'Coming soon',
    features: ['All 5 automations', 'Unlimited branches', 'Dedicated manager'],
    cta: 'Talk to us',
    locked: true,
  },
]

export default function StepPlanSelect() {
  const { nextStep } = useOnboarding()

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="text-center">
        <span className="onb-eyebrow mb-4">
          <span />
          PRICING
        </span>
        <h2
          className="text-3xl font-extrabold tracking-tight mt-4 mb-2"
          style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
        >
          Pay for what you switch on.
        </h2>
        <p className="text-base" style={{ color: 'var(--onb-ink-soft)' }}>
          Every plan includes all five automations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="relative flex flex-col rounded-2xl p-6"
            style={
              plan.featured
                ? {
                    background: 'linear-gradient(160deg, var(--onb-emerald-tint), var(--onb-cream) 130%)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    boxShadow: '0 0 0 1px rgba(16,185,129,0.15), 0 20px 60px rgba(16,185,129,0.18)',
                  }
                : {
                    background: 'var(--onb-cream-2)',
                    border: '1px solid var(--onb-line)',
                  }
            }
          >
            <div
              className="flex flex-col h-full"
              style={plan.locked ? { filter: 'blur(8px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' } : undefined}
            >
              {plan.badge && (
                <span
                  className="text-[10.5px] font-semibold tracking-wide px-2.5 py-1 rounded-full mb-3.5 w-fit"
                  style={{ background: 'var(--onb-emerald)', color: '#fff' }}
                >
                  {plan.badge}
                </span>
              )}
              <h3
                className="text-sm font-semibold mb-1.5"
                style={{ color: plan.featured ? 'rgba(246,245,241,0.6)' : 'var(--onb-muted)' }}
              >
                {plan.name}
              </h3>
              <div className="text-[32px] font-extrabold tracking-tight mb-0.5" style={{ color: 'var(--onb-ink)' }}>
                {plan.price}
                <span className="text-sm font-semibold">/mo</span>
              </div>
              <div
                className="text-xs mb-5"
                style={{ color: plan.featured ? 'rgba(246,245,241,0.55)' : 'var(--onb-muted)' }}
              >
                {plan.period}
              </div>
              <ul className="mb-5 flex-grow list-none p-0">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className="text-[13.5px] py-2 flex items-center gap-2"
                    style={{
                      borderTop: i === 0 ? 'none' : `1px solid ${plan.featured ? 'rgba(246,245,241,0.12)' : 'var(--onb-line)'}`,
                    }}
                  >
                    <span className="font-bold" style={{ color: plan.featured ? '#6ee7b7' : 'var(--onb-emerald)' }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={plan.locked}
                onClick={plan.locked ? undefined : nextStep}
                className="onb-btn-primary"
                style={
                  !plan.featured
                    ? { background: 'transparent', border: '1.5px solid var(--onb-line-strong)', color: 'var(--onb-ink)' }
                    : undefined
                }
              >
                {plan.cta}
              </button>
            </div>

            {plan.locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--onb-line)', color: 'var(--onb-muted)' }}
                >
                  <Lock className="w-4 h-4" />
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full"
                  style={{ background: 'rgba(11,11,8,0.75)', color: 'var(--onb-ink-soft)', border: '1px solid var(--onb-line)' }}
                >
                  Revealing Soon
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs" style={{ color: 'var(--onb-muted)' }}>
        No card required for the 14-day trial.
      </p>
    </div>
  )
}
