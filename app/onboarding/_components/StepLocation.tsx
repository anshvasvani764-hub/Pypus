'use client'

import { useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import { MapPin, Navigation, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

export default function StepLocation() {
  const { location, setLocation, selectedTemplate, nextStep } = useOnboarding()
  const [stateName, setStateName] = useState('')
  const [district, setDistrict] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setIsDetecting(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          // Reverse geocode via BigDataCloud API
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          )
          const data = await res.json()

          const detectedCity = data.city || data.locality || data.principalSubdivision || ''
          const detectedState = data.principalSubdivision || ''
          const detectedCountry = data.countryName || 'India'

          const fullDetectedAddress = [detectedCity, detectedState, detectedCountry]
            .filter(Boolean)
            .join(', ')

          setLocation(fullDetectedAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
          if (detectedState) setStateName(detectedState)
          if (detectedCity) setDistrict(detectedCity)
        } catch (err) {
          setError('Could not reverse geocode location. Please type your address manually.')
        } finally {
          setIsDetecting(false)
        }
      },
      (geoErr) => {
        setIsDetecting(false)
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError('Location permission denied. Please enter address manually.')
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          setError('Location information unavailable. Please type manually.')
        } else {
          setError('Location request timed out. Please enter address manually.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = location.trim()
    if (!trimmed) {
      setError('Please enter or detect your address to continue.')
      return
    }
    setError(null)
    nextStep()
  }

  const entityTitle = selectedTemplate?.name ? selectedTemplate.name.toLowerCase() : 'business'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      <div>
        <span className="onb-eyebrow mb-4">
          <span />
          LOCATION
        </span>
        <h2
          className="text-3xl font-extrabold tracking-tight mt-4 mb-2"
          style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
        >
          Where is your {entityTitle}?
        </h2>
        <p className="text-base" style={{ color: 'var(--onb-ink-soft)' }}>
          We'll use this for local scheduling and receipts.
        </p>
      </div>

      <div className="onb-card p-6 space-y-4">
        {/* State & District Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider block"
              style={{ color: 'var(--onb-muted)' }}
            >
              State
            </label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="e.g. Haryana"
              className="onb-input"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider block"
              style={{ color: 'var(--onb-muted)' }}
            >
              City
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Gurugram"
              className="onb-input"
            />
          </div>
        </div>

        {/* Full Address Search Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--onb-muted)' }}
            >
              Full Address
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors py-1 px-2.5 rounded-lg disabled:opacity-50 hover:bg-white/5"
              style={{ color: 'var(--onb-emerald)' }}
            >
              {isDetecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Use my current location</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--onb-emerald)' }}>
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Search or enter your full address"
              className="onb-input"
              style={{ paddingLeft: 48 }}
            />
          </div>
        </div>

        {error && (
          <p
            className="text-xs font-medium p-3 rounded-lg"
            style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            {error}
          </p>
        )}

        {/* Selected Address Feedback Chip */}
        {location.trim() && (
          <div
            className="rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300"
            style={{ background: 'var(--onb-emerald-tint)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <div className="p-2 rounded-lg" style={{ background: 'var(--onb-emerald)', color: '#08080a' }}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--onb-emerald)' }}>
                Selected Address
              </p>
              <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--onb-ink)' }}>
                {location}
              </p>
            </div>
          </div>
        )}

        {/* Visual Map Stylized Preview Card */}
        <div
          className="rounded-xl overflow-hidden relative h-36 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--onb-line)' }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-1.5 text-center px-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-md animate-bounce"
              style={{ background: 'var(--onb-emerald)', color: '#08080a' }}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--onb-ink)' }}>
              Location Pin Verified
            </span>
          </div>
        </div>
      </div>

      <button onClick={handleSubmit} type="submit" className="onb-btn-primary">
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}
