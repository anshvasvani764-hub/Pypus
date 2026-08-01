'use client'

import React, { createContext, useContext, useState } from 'react'
import { SelectedTemplate, performWorkspaceCreation } from '@/lib/supabase/createWorkspace'
import { createClient } from '@/lib/supabase/client'

interface OnboardingState {
  step: number
  selectedTemplate: SelectedTemplate | null
  bizName: string
  phone: string
  location: string
  state: string
  memberCount: string
  trainerCount: string
  createdWorkspaceId: string | null
  isSubmitting: boolean
  creationError: string | null
  setSelectedTemplate: (template: SelectedTemplate | null) => void
  setBizName: (name: string) => void
  setPhone: (phone: string) => void
  setLocation: (loc: string) => void
  setState: (state: string) => void
  setMemberCount: (count: string) => void
  setTrainerCount: (count: string) => void
  setCreatedWorkspaceId: (id: string | null) => void
  setIsSubmitting: (val: boolean) => void
  setCreationError: (val: string | null) => void
  submitOnboarding: () => Promise<void>
  nextStep: () => void
  prevStep: () => void
  setStep: (step: number) => void
}

const OnboardingContext = createContext<OnboardingState | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<number>(1)
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null)
  const [bizName, setBizName] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [state, setState] = useState<string>('')
  const [memberCount, setMemberCount] = useState<string>('51–150')
  const [trainerCount, setTrainerCount] = useState<string>('No trainer — I manage myself')
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [creationError, setCreationError] = useState<string | null>(null)

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5))
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

  const submitOnboarding = async () => {
    setIsSubmitting(true)
    setCreationError(null)
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

      setCreatedWorkspaceId(wsId)
    } catch (err: any) {
      setCreationError(err.message || 'Failed to create workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        step,
        selectedTemplate,
        bizName,
        phone,
        location,
        state,
        memberCount,
        trainerCount,
        createdWorkspaceId,
        isSubmitting,
        creationError,
        setSelectedTemplate,
        setBizName,
        setPhone,
        setLocation,
        setState,
        setMemberCount,
        setTrainerCount,
        setCreatedWorkspaceId,
        setIsSubmitting,
        setCreationError,
        submitOnboarding,
        nextStep,
        prevStep,
        setStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
