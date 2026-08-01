'use client'

import { useOnboarding } from '@/context/OnboardingContext'
import StepIndustry from '../_components/StepIndustry'
import StepBusinessName from '../_components/StepBusinessName'
import StepPhone from '../_components/StepPhone'
import StepLocation from '../_components/StepLocation'
import StepLoadingSuccess from '../_components/StepLoadingSuccess'
import { motion, AnimatePresence } from 'framer-motion'

export function OnboardingPageDesktop() {
  const { step } = useOnboarding()

  const renderStepComponent = () => {
    switch (step) {
      case 1:
        return <StepIndustry />
      case 2:
        return <StepBusinessName />
      case 3:
        return <StepPhone />
      case 4:
        return <StepLocation />
      case 5:
        return <StepLoadingSuccess />
      default:
        return <StepIndustry />
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-1 flex flex-col"
        >
          {renderStepComponent()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
