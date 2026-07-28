'use client'

import React, { createContext, useContext, useState } from 'react'
import { SelectedTemplate } from '@/lib/supabase/createWorkspace'

interface OnboardingState {
  step: number
  selectedTemplate: SelectedTemplate | null
  bizName: string
  phone: string
  location: string
  memberCount: string
  trainerCount: string
  createdWorkspaceId: string | null
  setSelectedTemplate: (template: SelectedTemplate | null) => void
  setBizName: (name: string) => void
  setPhone: (phone: string) => void
  setLocation: (loc: string) => void
  setMemberCount: (count: string) => void
  setTrainerCount: (count: string) => void
  setCreatedWorkspaceId: (id: string | null) => void
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
  const [memberCount, setMemberCount] = useState<string>('51–150')
  const [trainerCount, setTrainerCount] = useState<string>('No trainer — I manage myself')
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null)

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5))
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

  return (
    <OnboardingContext.Provider
      value={{
        step,
        selectedTemplate,
        bizName,
        phone,
        location,
        memberCount,
        trainerCount,
        createdWorkspaceId,
        setSelectedTemplate,
        setBizName,
        setPhone,
        setLocation,
        setMemberCount,
        setTrainerCount,
        setCreatedWorkspaceId,
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
