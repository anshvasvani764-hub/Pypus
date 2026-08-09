'use client'

import { useOnboarding } from '@/context/OnboardingContext'
import StepBusinessDetails from '../_components/StepBusinessDetails'
import StepPhone from '../_components/StepPhone'
import StepLocation from '../_components/StepLocation'
import StepPlanSelect from '../_components/StepPlanSelect'
import StepLoadingSuccess from '../_components/StepLoadingSuccess'
import { motion, AnimatePresence } from 'framer-motion'

export function OnboardingPageDesktop() {
  const { step } = useOnboarding()

  const renderStepComponent = () => {
    switch (step) {
      case 1:
        return <StepBusinessDetails />
      case 2:
        return <StepPhone />
      case 3:
        return <StepLocation />
      case 4:
        return <StepPlanSelect />
      case 5:
        return <StepLoadingSuccess />
      default:
        return <StepBusinessDetails />
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto px-4 pb-10" style={{ paddingTop: 32 }}>
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
