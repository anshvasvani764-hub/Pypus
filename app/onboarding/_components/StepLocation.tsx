'use client'

import { useOnboarding } from '@/context/OnboardingContext'
import { MapPin, Navigation, Loader2, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function StepLocation() {
  const {
    addressLine1,
    setAddressLine1,
    state,
    setState,
    city,
    setCity,
    pincode,
    setPincode,
    setLocation,
    selectedTemplate,
    nextStep,
  } = useOnboarding()
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

          const detectedCity = data.city || data.locality || ''
          const detectedState = data.principalSubdivision || ''

          if (detectedCity) setCity(detectedCity)
          if (detectedState) setState(detectedState)
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
    if (!addressLine1.trim() || !state.trim() || !city.trim() || !pincode.trim()) {
      setError('Please fill in all address fields to continue.')
      return
    }
    setError(null)
    // Keep the combined `location` string in sync for anything still reading it
    setLocation([addressLine1, city, state, pincode].filter(Boolean).join(', '))
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
        <div className="flex items-center justify-end -mb-1">
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

        {/* Address Line 1 */}
        <div className="space-y-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--onb-muted)' }}
          >
            Address Line 1
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--onb-emerald)' }}>
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => {
                setAddressLine1(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Shop 12, Sector 14 Market"
              className="onb-input"
              style={{ paddingLeft: 48 }}
            />
          </div>
        </div>

        {/* State & City */}
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
              value={state}
              onChange={(e) => {
                setState(e.target.value)
                if (error) setError(null)
              }}
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
              value={city}
              onChange={(e) => {
                setCity(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Gurugram"
              className="onb-input"
            />
          </div>
        </div>

        {/* Pincode */}
        <div className="space-y-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--onb-muted)' }}
          >
            Pincode
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. 122001"
            className="onb-input"
            style={{ maxWidth: 200 }}
          />
        </div>

        {error && (
          <p
            className="text-xs font-medium p-3 rounded-lg"
            style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            {error}
          </p>
        )}
      </div>

      <button onClick={handleSubmit} type="submit" className="onb-btn-primary">
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}
