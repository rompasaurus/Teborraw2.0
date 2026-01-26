import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Lightbulb, FileText, List, Hash, Save, Keyboard } from 'lucide-react'

const TUTORIAL_STORAGE_KEY = 'teboraw-thoughts-tutorial-completed'

interface TutorialStep {
  title: string
  description: string
  icon: React.ElementType
  targetId?: string
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Thoughts',
    description: 'Thoughts is your personal journaling space. Organize your ideas with a simple syntax that automatically creates a navigable structure. Let\'s walk through how it works.',
    icon: Lightbulb,
    position: 'center',
  },
  {
    title: 'The Editor',
    description: 'This is where you write your thoughts. Use a colon (:) at the end of a line to create a topic. Indent with tabs to create nested subtopics.',
    icon: FileText,
    targetId: 'thoughts-editor-container',
    position: 'top-right',
  },
  {
    title: 'Topic Tree',
    description: 'As you type, topics automatically appear here. Click on any topic to jump to that section in the editor. The tree reflects your content\'s structure.',
    icon: List,
    targetId: 'topic-tree',
    position: 'top-left',
  },
  {
    title: 'Topic Details',
    description: 'Select a topic to see its details here, including line number and indent level. This helps you navigate large documents.',
    icon: Hash,
    targetId: 'thoughts-details-panel',
    position: 'bottom-right',
  },
  {
    title: 'Saving Your Work',
    description: 'Click the Save button or press Cmd/Ctrl+S to save. Your thoughts are stored securely and can be accessed anytime.',
    icon: Save,
    targetId: 'thoughts-save-btn',
    position: 'top-right',
  },
  {
    title: 'Quick Tips',
    description: 'Start lines with a topic ending in ":" to create sections. Use Tab to indent for sub-topics. Press Cmd/Ctrl+N to create a new thought. Happy writing!',
    icon: Keyboard,
    position: 'center',
  },
]

interface ThoughtsTutorialProps {
  onComplete: () => void
  isOpen: boolean
}

export function ThoughtsTutorial({ onComplete, isOpen }: ThoughtsTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

  const step = tutorialSteps[currentStep]
  const isLastStep = currentStep === tutorialSteps.length - 1
  const isFirstStep = currentStep === 0

  // Update highlight rect when step changes
  useEffect(() => {
    if (!isOpen || !step.targetId) {
      setHighlightRect(null)
      return
    }

    const updateRect = () => {
      const element = document.getElementById(step.targetId!)
      if (element) {
        setHighlightRect(element.getBoundingClientRect())
      }
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [isOpen, step.targetId, currentStep])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
      onComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }, [isLastStep, onComplete])

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [isFirstStep])

  const handleSkip = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    onComplete()
  }, [onComplete])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') handleSkip()
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    },
    [isOpen, handleSkip, handleNext, handlePrev]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  const Icon = step.icon

  // Calculate tooltip position based on step position and target
  const getTooltipStyle = (): React.CSSProperties => {
    if (step.position === 'center' || !highlightRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const padding = 20
    const tooltipWidth = 400

    switch (step.position) {
      case 'top-left':
        return {
          top: highlightRect.top + padding,
          left: highlightRect.right + padding,
          maxWidth: tooltipWidth,
        }
      case 'top-right':
        return {
          top: highlightRect.top + padding,
          right: window.innerWidth - highlightRect.left + padding,
          maxWidth: tooltipWidth,
        }
      case 'bottom-left':
        return {
          bottom: window.innerHeight - highlightRect.bottom + padding,
          left: highlightRect.right + padding,
          maxWidth: tooltipWidth,
        }
      case 'bottom-right':
        return {
          top: highlightRect.top - 200,
          right: window.innerWidth - highlightRect.left + padding,
          maxWidth: tooltipWidth,
        }
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
    }
  }

  return (
    <div id="thoughts-tutorial-overlay" className="fixed inset-0 z-50">
      {/* Backdrop with cutout */}
      <div className="absolute inset-0 bg-black/70" onClick={handleSkip} />

      {/* Highlight cutout */}
      {highlightRect && (
        <div
          id="thoughts-tutorial-highlight"
          className="absolute border-2 border-primary-500 rounded-lg pointer-events-none"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        id="thoughts-tutorial-card"
        className="absolute bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6"
        style={getTooltipStyle()}
      >
        {/* Close button */}
        <button
          id="thoughts-tutorial-close-btn"
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div id="thoughts-tutorial-steps" className="flex items-center gap-1 mb-4">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-primary-500'
                  : index < currentStep
                  ? 'w-3 bg-primary-500/50'
                  : 'w-3 bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div id="thoughts-tutorial-content" className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 id="thoughts-tutorial-title" className="text-lg font-semibold text-white mb-2">
              {step.title}
            </h3>
            <p id="thoughts-tutorial-description" className="text-sm text-slate-300 leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div id="thoughts-tutorial-nav" className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
          <button
            id="thoughts-tutorial-skip-btn"
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                id="thoughts-tutorial-prev-btn"
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              id="thoughts-tutorial-next-btn"
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to check if tutorial should be shown
export function useShouldShowTutorial(): boolean {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    setShouldShow(!completed)
  }, [])

  return shouldShow
}

// Function to reset tutorial (for testing or settings)
export function resetThoughtsTutorial(): void {
  localStorage.removeItem(TUTORIAL_STORAGE_KEY)
}
