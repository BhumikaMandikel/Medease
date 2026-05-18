import { useState } from 'react';
import { Language, HealthProfile } from '../lib/types';
import { createProfile } from '../lib/profileApi';

interface OnboardingScreenProps {
  language: Language;
  onComplete: () => void;
}

type OnboardingStep = 'name' | 'age' | 'meals';

export default function OnboardingScreen({ language, onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [breakfastTime, setBreakfastTime] = useState('');
  const [lunchTime, setLunchTime] = useState('');
  const [dinnerTime, setDinnerTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateDateOfBirth = (ageValue: string): string | undefined => {
    const ageNum = parseInt(ageValue);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      return undefined;
    }
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - ageNum;
    return `${birthYear}-01-01`; // Approximate DOB
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStep('age');
    }
  };

  const handleAgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(age);
    if (age.trim() && !isNaN(ageNum) && ageNum > 0 && ageNum <= 120) {
      setStep('meals');
    }
  };

  const handleMealsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);

    // Create profile with collected information
    const profile: HealthProfile = {
      name: name.trim(),
      preferred_language: language,
      date_of_birth: calculateDateOfBirth(age),
      conditions: [],
      allergies: [],
      meal_times: {
        breakfast: breakfastTime || undefined,
        lunch: lunchTime || undefined,
        dinner: dinnerTime || undefined,
      },
      monitoring: [],
      visits: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    await createProfile(profile);
    
    setIsSubmitting(false);

    // Proceed even if profile creation failed (silent failure)
    onComplete();
  };

  const handleBack = () => {
    if (step === 'age') {
      setStep('name');
    } else if (step === 'meals') {
      setStep('age');
    }
  };

  const renderProgressBar = () => {
    const steps = ['name', 'age', 'meals'];
    const currentIndex = steps.indexOf(step);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Step {currentIndex + 1} of {steps.length}</span>
          <span className="text-sm font-medium text-gray-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to MedEase
          </h1>
          <p className="text-lg text-gray-600">
            Your personal health companion
          </p>
        </div>

        {renderProgressBar()}

        {/* Step 1: Name */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-lg font-medium text-gray-700 mb-2">
                What should I call you?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors"
            >
              Next →
            </button>
          </form>
        )}

        {/* Step 2: Age */}
        {step === 'age' && (
          <form onSubmit={handleAgeSubmit} className="space-y-6">
            <div>
              <label htmlFor="age" className="block text-lg font-medium text-gray-700 mb-2">
                How old are you?
              </label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="1"
                max="120"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                This helps us provide age-appropriate health guidance
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg text-lg transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={!age.trim() || parseInt(age) <= 0 || parseInt(age) > 120}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors"
              >
                Next →
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Meal Times */}
        {step === 'meals' && (
          <form onSubmit={handleMealsSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-700 mb-4">
                When do you usually have your meals?
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                This helps us schedule your medicine reminders at the right times
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="breakfast" className="block text-sm font-medium text-gray-700 mb-1">
                    Breakfast (optional)
                  </label>
                  <input
                    id="breakfast"
                    type="time"
                    value={breakfastTime}
                    onChange={(e) => setBreakfastTime(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="lunch" className="block text-sm font-medium text-gray-700 mb-1">
                    Lunch (optional)
                  </label>
                  <input
                    id="lunch"
                    type="time"
                    value={lunchTime}
                    onChange={(e) => setLunchTime(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="dinner" className="block text-sm font-medium text-gray-700 mb-1">
                    Dinner (optional)
                  </label>
                  <input
                    id="dinner"
                    type="time"
                    value={dinnerTime}
                    onChange={(e) => setDinnerTime(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg text-lg transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup ✓
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <p className="text-sm text-gray-500 text-center mt-6">
          Your information is stored securely on your device
        </p>
      </div>
    </div>
  );
}


