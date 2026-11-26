import React, { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useLoading } from '@/core/loading'
import {
  changeAppLanguage,
  getSavedLanguage,
  type SupportedLanguage,
} from '@/core/i18n'
import {
  applyTheme,
  getThemePreference,
  type ThemePreference,
} from '@/utils/theme'
import { applyUiScale, getSavedUiScale } from '@/utils/ui-scale'
import { getUiStyle, setUiStyle, type UiStyle } from '@/utils/ui-style'
import {
  hasCompletedSetup,
  markSetupCompleted,
  SETUP_CLOSE_EVENT,
  SETUP_OPEN_EVENT,
} from './setup-storage'
import { SetupTopBar } from './components/SetupTopBar'
import { SetupBottomBar } from './components/SetupBottomBar'
import { StepWelcome } from './components/StepWelcome'
import { StepAbout } from './components/StepAbout'
import { StepLanguage } from './components/StepLanguage'
import { StepTheme } from './components/StepTheme'
import { StepUiScale } from './components/StepUiScale'
import { StepStyle } from './components/StepStyle'
import { StepComplete } from './components/StepComplete'

const TOTAL_STEPS = 7
const STYLE_STEP = 6

/**
 * Full-screen onboarding wizard sitting above all app views and sidebar,
 * revealed smoothly beneath LoadingScreen when startup finishes.
 */
export const SetupOnboarding: React.FC = () => {
  const { isLoading, isFadingOut } = useLoading()
  const [isVisible, setIsVisible] = useState<boolean>(
    () => !hasCompletedSetup(),
  )
  const [isClosing, setIsClosing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false)
  const [setupRunId, setSetupRunId] = useState(0)

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    () => getSavedLanguage(),
  )
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(() =>
    getThemePreference(),
  )
  const [uiScale, setUiScale] = useState<number>(() => getSavedUiScale())
  const [selectedStyle, setSelectedStyle] = useState<UiStyle>(() =>
    getUiStyle(),
  )

  const backdropRef = useRef<HTMLDivElement>(null)
  const stepStageRef = useRef<HTMLDivElement>(null)
  const prevStepRef = useRef(1)
  const isTransitioningRef = useRef(false)

  useEffect(() => {
    const handleReopen = () => {
      if (stepStageRef.current) {
        gsap.killTweensOf(stepStageRef.current)
        gsap.set(stepStageRef.current, { opacity: 1, x: 0, clearProps: 'transform' })
      }
      if (backdropRef.current) {
        gsap.killTweensOf(backdropRef.current)
        gsap.set(backdropRef.current, { opacity: 1 })
      }
      isTransitioningRef.current = false
      prevStepRef.current = 1
      setCurrentStep(1)
      setIsClosing(false)
      setHasCompletedWelcome(false)
      setSetupRunId((prev) => prev + 1)
      setSelectedLanguage(getSavedLanguage())
      setSelectedTheme(getThemePreference())
      setUiScale(getSavedUiScale())
      setSelectedStyle(getUiStyle())
      setIsVisible(true)
    }
    const handleForceClose = () => {
      if (stepStageRef.current) {
        gsap.killTweensOf(stepStageRef.current)
      }
      if (backdropRef.current) {
        gsap.killTweensOf(backdropRef.current)
      }
      isTransitioningRef.current = false
      setIsClosing(false)
      setIsVisible(false)
    }
    window.addEventListener(SETUP_OPEN_EVENT, handleReopen)
    window.addEventListener(SETUP_CLOSE_EVENT, handleForceClose)
    return () => {
      window.removeEventListener(SETUP_OPEN_EVENT, handleReopen)
      window.removeEventListener(SETUP_CLOSE_EVENT, handleForceClose)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const el = stepStageRef.current
    const prevStep = prevStepRef.current
    prevStepRef.current = currentStep
    if (!el || prevStep === currentStep) {
      isTransitioningRef.current = false
      return
    }

    const direction = currentStep >= prevStep ? 1 : -1
    gsap.killTweensOf(el)
    const tween = gsap.fromTo(
      el,
      { opacity: 0, x: 24 * direction },
      {
        opacity: 1,
        x: 0,
        duration: 0.3,
        ease: 'power3.out',
        clearProps: 'transform',
        onComplete: () => {
          isTransitioningRef.current = false
        },
      },
    )
    return () => {
      tween.kill()
    }
  }, [currentStep, isVisible])

  const handleIntroComplete = useCallback(() => {
    setHasCompletedWelcome(true)
  }, [])

  const handleSelectLanguage = useCallback((lang: SupportedLanguage) => {
    setSelectedLanguage(lang)
    changeAppLanguage(lang)
  }, [])

  const handleSelectTheme = useCallback((pref: ThemePreference) => {
    setSelectedTheme(pref)
    applyTheme(pref)
  }, [])

  const handleChangeScale = useCallback((scale: number) => {
    const clamped = applyUiScale(scale)
    setUiScale(clamped)
  }, [])

  const handleSelectStyle = useCallback((style: UiStyle) => {
    const applied = setUiStyle(style)
    setSelectedStyle(applied)
  }, [])

  const transitionToStep = useCallback(
    (nextStep: number) => {
      if (
        isClosing ||
        isTransitioningRef.current ||
        nextStep === currentStep ||
        nextStep < 1 ||
        nextStep > TOTAL_STEPS
      ) {
        return
      }
      isTransitioningRef.current = true
      const direction = nextStep > currentStep ? 1 : -1

      // Gradually lower backdrop opacity to 0.4 on the Style preview step,
      // and fade back up to 1.0 when leaving it.
      if (backdropRef.current) {
        if (nextStep === STYLE_STEP) {
          gsap.to(backdropRef.current, {
            opacity: 0.4,
            duration: 0.48,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        } else if (currentStep === STYLE_STEP) {
          gsap.to(backdropRef.current, {
            opacity: 1,
            duration: 0.46,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
      }

      const el = stepStageRef.current
      if (!el) {
        prevStepRef.current = currentStep
        setCurrentStep(nextStep)
        return
      }
      gsap.killTweensOf(el)
      gsap.to(el, {
        opacity: 0,
        x: -24 * direction,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          prevStepRef.current = currentStep
          setCurrentStep(nextStep)
        },
      })
    },
    [currentStep, isClosing],
  )

  const handleBack = useCallback(() => {
    transitionToStep(currentStep - 1)
  }, [currentStep, transitionToStep])

  const handleNext = useCallback(() => {
    transitionToStep(currentStep + 1)
  }, [currentStep, transitionToStep])

  const handleFinish = useCallback(() => {
    if (isClosing) return
    isTransitioningRef.current = false
    if (stepStageRef.current) {
      gsap.killTweensOf(stepStageRef.current)
    }
    if (backdropRef.current) {
      gsap.killTweensOf(backdropRef.current)
      gsap.set(backdropRef.current, { opacity: 1 })
    }
    changeAppLanguage(selectedLanguage)
    applyTheme(selectedTheme)
    applyUiScale(uiScale)
    setUiStyle(selectedStyle)
    markSetupCompleted()
    setIsClosing(true)
    window.setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
    }, 280)
  }, [isClosing, selectedLanguage, selectedTheme, uiScale, selectedStyle])

  if (!isVisible) return null

  const canAnimateWelcome = !isLoading || isFadingOut
  const isNextVisible = currentStep > 1 || hasCompletedWelcome

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="WeekBox Setup"
      className={`fixed inset-0 z-[90] flex flex-col overflow-hidden select-none transition-opacity duration-300 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        color: 'var(--md-sys-color-on-background)',
      }}
    >
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundColor: 'var(--md-sys-color-background)',
          opacity: 1,
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full">
        <SetupTopBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <main className="flex-1 min-h-0 w-full flex flex-col">
          <m3e-overflow direction="vertical" className="w-full h-full">
            <div className="min-h-full w-full flex items-center justify-center py-6">
              <div ref={stepStageRef} className="w-full flex justify-center">
                {currentStep === 1 && (
                  <StepWelcome
                    key={setupRunId}
                    canAnimate={canAnimateWelcome}
                    shouldSkipAnimation={hasCompletedWelcome}
                    onIntroComplete={handleIntroComplete}
                  />
                )}
                {currentStep === 2 && (
                  <StepLanguage
                    selectedLanguage={selectedLanguage}
                    onSelectLanguage={handleSelectLanguage}
                  />
                )}
                {currentStep === 3 && <StepAbout />}
                {currentStep === 4 && (
                  <StepTheme
                    selectedTheme={selectedTheme}
                    onSelectTheme={handleSelectTheme}
                  />
                )}
                {currentStep === 5 && (
                  <StepUiScale
                    uiScale={uiScale}
                    onChangeScale={handleChangeScale}
                  />
                )}
                {currentStep === 6 && (
                  <StepStyle
                    selectedStyle={selectedStyle}
                    onSelectStyle={handleSelectStyle}
                  />
                )}
                {currentStep === 7 && (
                  <StepComplete
                    selectedLanguage={selectedLanguage}
                    selectedTheme={selectedTheme}
                    uiScale={uiScale}
                    selectedStyle={selectedStyle}
                  />
                )}
              </div>
            </div>
          </m3e-overflow>
        </main>

        <SetupBottomBar
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          isNextVisible={isNextVisible}
          onBack={handleBack}
          onNext={handleNext}
          onFinish={handleFinish}
        />
      </div>
    </div>
  )
}
