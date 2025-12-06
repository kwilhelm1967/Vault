import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Plus,
  Search,
  Lock,
  Star,
  Settings,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Sparkles,
  Smartphone,
} from "lucide-react";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Welcome to Local Password Vault",
    description:
      "Your passwords are encrypted and stored 100% locally on your device. No cloud, no servers, no tracking. Just you and your secure vault.",
    icon: <Shield className="w-12 h-12 text-emerald-400" />,
    tip: "Your vault is now secured with AES-256 encryption. Let's take a quick tour!",
  },
  {
    id: 2,
    title: "Add Your First Account",
    description:
      "Click the + button to add a new account. Fill in the account name, username, and password. You can also add notes and custom fields.",
    icon: <Plus className="w-12 h-12 text-blue-400" />,
    tip: "Use the password generator to create strong, unique passwords for each account.",
  },
  {
    id: 3,
    title: "Find Accounts Quickly",
    description:
      "Use the search bar to instantly find any account. Search works across account names, usernames, and notes.",
    icon: <Search className="w-12 h-12 text-purple-400" />,
    tip: "Press Ctrl+F (or Cmd+F on Mac) to jump to search from anywhere.",
  },
  {
    id: 4,
    title: "Organize with Categories",
    description:
      "Keep your passwords organized with categories like Banking, Shopping, Social, and more. Click a category in the sidebar to filter.",
    icon: <Key className="w-12 h-12 text-amber-400" />,
    tip: "Use the 'All' category to see everything at once.",
  },
  {
    id: 5,
    title: "Mark Favorites",
    description:
      "Star your most-used accounts to mark them as favorites. Access them quickly from the Favorites filter in the sidebar.",
    icon: <Star className="w-12 h-12 text-yellow-400" />,
    tip: "Click the star icon on any entry to toggle favorite status.",
  },
  {
    id: 6,
    title: "Stay Secure",
    description:
      "Your vault automatically locks after inactivity. Click the lock icon or close the app to secure your passwords instantly.",
    icon: <Lock className="w-12 h-12 text-red-400" />,
    tip: "Set your preferred auto-lock timeout in Settings.",
  },
  {
    id: 7,
    title: "Customize Your Experience",
    description:
      "Visit Settings to customize auto-lock timeout, export/import your data, and manage your vault preferences.",
    icon: <Settings className="w-12 h-12 text-orange-400" />,
    tip: "Export your vault regularly as a backup!",
  },
  {
    id: 8,
    title: "Mobile Access",
    description:
      "Need your passwords on your phone? Go to Settings > Mobile Access or use the Dashboard quick action. Scan the QR code with your phone to view your vault securely in any mobile browser.",
    icon: <Smartphone className="w-12 h-12 text-blue-400" />,
    tip: "Mobile tokens auto-expire for security. Generate new ones anytime you need access.",
  },
  {
    id: 9,
    title: "You're All Set!",
    description:
      "You're ready to start using Local Password Vault. Your digital life is now more secure than ever!",
    icon: <Sparkles className="w-12 h-12 text-brand-gold" />,
    tip: "Press Shift + / (the ? key) to view all keyboard shortcuts.",
  },
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setIsAnimating(false);
    }, 150);
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="form-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-blue-400 w-6"
                    : index < currentStep
                    ? "bg-emerald-400"
                    : "bg-slate-600"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-8 pt-14">
            <div
              className={`transition-all duration-150 ${
                isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              }`}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-slate-700/30 rounded-2xl animate-float">
                  {step.icon}
                </div>
              </div>

              {/* Step number */}
              <div className="text-center mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Step {step.id} of {steps.length}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-4">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-slate-300 text-center leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Tip */}
              {step.tip && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-300 text-center">
                    <span className="font-semibold">💡 Tip:</span> {step.tip}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 flex items-center justify-between">
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Skip tutorial
            </button>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors btn-press"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors btn-press ripple"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to manage onboarding state
// Pass isVaultUnlocked to only show onboarding after user logs in
export const useOnboarding = (isVaultUnlocked: boolean = false) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    // Only trigger onboarding once per session, after vault is unlocked
    if (!isVaultUnlocked || hasTriggered) return;
    
    const hasSeenOnboarding = localStorage.getItem("onboarding_completed");
    if (!hasSeenOnboarding) {
      // Delay showing onboarding to let the app settle after login
      const timer = setTimeout(() => {
        setShowOnboarding(true);
        setHasTriggered(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Mark as triggered so we don't check again
      setHasTriggered(true);
    }
  }, [isVaultUnlocked, hasTriggered]);

  // Listen for replay-onboarding event (from Settings)
  useEffect(() => {
    const handleReplayOnboarding = () => {
      setShowOnboarding(true);
    };
    
    window.addEventListener('replay-onboarding', handleReplayOnboarding);
    return () => window.removeEventListener('replay-onboarding', handleReplayOnboarding);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("onboarding_completed", "true");
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem("onboarding_completed");
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
};

