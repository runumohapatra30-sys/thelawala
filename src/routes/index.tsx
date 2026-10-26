import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import OnboardingScreen from '@/components/OnboardingScreen';

export const Route = createFileRoute('/')({
  component: HomeEntry,
});

function HomeEntry() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let alive = true;
    
    // Check onboarding status from localStorage
    const onboardingCompleted = window.localStorage.getItem("thelawala_onboarding_completed");
    if (!onboardingCompleted) {
      setShowWelcome(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT") {
        window.localStorage.removeItem("thelawala_onboarding_completed");
        setShowWelcome(true);
      }
      if (session) setHasSession(true);
      else setHasSession(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      if (session) setHasSession(true);
      else setHasSession(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show onboarding screen if not completed
  if (showWelcome) {
    return (
      <OnboardingScreen 
        onComplete={() => {
          window.localStorage.setItem("thelawala_onboarding_completed", "true");
          setShowWelcome(false);
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-orange-600 mb-2">ThelaWala Express</h1>
      <p className="text-gray-600 mb-6">Welcome to your hyperlocal delivery service!</p>
      {/* Home page main content goes here */}
    </div>
  );
}
