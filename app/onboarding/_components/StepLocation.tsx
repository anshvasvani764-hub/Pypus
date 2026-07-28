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
    <div className="flex-grow flex flex-col justify-between px-4 py-8 max-w-xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Headline Section */}
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#191c1e]">
            Where is your {entityTitle}?
          </h2>
          <p className="text-sm md:text-base text-[#434656]">
            Help us locate your business to optimize local scheduling and settings.
          </p>
        </div>

        {/* Form Inputs Container */}
        <div className="space-y-4">
          {/* State & District Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#434656] uppercase tracking-wider mb-1.5 ml-1">
                State
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="w-full bg-white border border-[#c3c5d9] focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] rounded-xl py-3 px-4 text-sm text-[#191c1e] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#434656] uppercase tracking-wider mb-1.5 ml-1">
                District / City
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full bg-white border border-[#c3c5d9] focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] rounded-xl py-3 px-4 text-sm text-[#191c1e] outline-none transition-all"
              />
            </div>
          </div>

          {/* Premium Full Address Search Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#434656] uppercase tracking-wider ml-1">
                Full Address
              </label>
              {/* Auto Detect Button */}
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003ec7] hover:text-[#0052ff] transition-colors py-1 px-2.5 rounded-lg hover:bg-[#0052ff]/10 disabled:opacity-50"
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
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#003ec7]">
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
                className="w-full bg-white border border-[#c3c5d9] focus:border-[#003ec7] focus:ring-2 focus:ring-[#003ec7]/20 rounded-xl py-4 pl-12 pr-4 shadow-sm text-sm text-[#191c1e] outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-[#ba1a1a] bg-[#ffdad6] p-3 rounded-lg border border-[#ba1a1a]/20">
              {error}
            </p>
          )}

          {/* Selected Address Feedback Chip */}
          {location.trim() && (
            <div className="bg-[#0052ff]/10 border border-[#0052ff]/30 rounded-xl p-4 flex items-center justify-between animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-[#0052ff] p-2 rounded-lg text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#003ec7] uppercase tracking-wider">
                    Selected Address
                  </p>
                  <p className="text-sm font-semibold text-[#191c1e] line-clamp-1">
                    {location}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Visual Map Stylized Preview Card */}
          <div className="rounded-xl overflow-hidden border border-[#c3c5d9]/60 relative h-36 bg-[#eceef0] flex items-center justify-center">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#003ec7_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 flex flex-col items-center gap-1.5 text-center px-4">
              <div className="w-8 h-8 rounded-full bg-[#003ec7] text-white flex items-center justify-center shadow-md animate-bounce">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#191c1e]">Location Pin Verified</span>
            </div>
          </div>
        </div>
      </form>

      {/* Footer Action */}
      <div className="pt-8">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#003ec7] hover:bg-[#0052ff] text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
