import { createContext, useContext, useState, type ReactNode } from 'react';

interface AnimationContextType {
  hasAnimated: boolean;
  markAsAnimated: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [hasAnimated, setHasAnimated] = useState(false);

  const markAsAnimated = () => {
    setHasAnimated(true);
  };

  return (
    <AnimationContext.Provider value={{ hasAnimated, markAsAnimated }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}
