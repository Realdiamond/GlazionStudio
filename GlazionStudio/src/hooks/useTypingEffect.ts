import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectOptions {
  speed?: number; // Characters per second (default: 50)
  delay?: number; // Initial delay before typing starts (default: 100ms)
  onComplete?: () => void; // Callback when typing is complete
  onStart?: () => void; // NEW: Callback when typing starts
}

interface UseTypingEffectReturn {
  displayedText: string;
  isTyping: boolean;
  startTyping: (text: string) => void;
  stopTyping: () => void;
  resetTyping: () => void;
}

export const useTypingEffect = (options: UseTypingEffectOptions = {}): UseTypingEffectReturn => {
  const { speed = 800, delay = 0, onComplete, onStart } = options;
  
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [targetText, setTargetText] = useState('');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);
  const hasStartedRef = useRef(false);

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startTyping = (text: string) => {
    clearTimers();
    setTargetText(text);
    setDisplayedText('');
    setIsTyping(true);
    currentIndexRef.current = 0;
    hasStartedRef.current = false;

    // Ensure the component is mounted and text is available
    if (!text) {
      setIsTyping(false);
      return;
    }

    // Start typing after initial delay
    timeoutRef.current = setTimeout(() => {
      // Call onStart callback when typing actually begins
      if (!hasStartedRef.current) {
        onStart?.();
        hasStartedRef.current = true;
      }

      const interval = 1000 / speed; // Convert speed to interval in ms
      
      intervalRef.current = setInterval(() => {
        const nextIndex = currentIndexRef.current + 1;
        const nextText = text.substring(0, nextIndex);
        
        if (nextIndex >= text.length) {
          clearTimers();
          setIsTyping(false);
          setDisplayedText(text); // Ensure full text is displayed
          onComplete?.();
          return;
        }
        
        currentIndexRef.current = nextIndex;
        setDisplayedText(nextText);
      }, interval);
    }, delay);
  };

  const stopTyping = () => {
    clearTimers();
    setIsTyping(false);
    setDisplayedText(targetText); // Show full text immediately
    onComplete?.();
  };

  const resetTyping = () => {
    clearTimers();
    setDisplayedText('');
    setTargetText('');
    setIsTyping(false);
    currentIndexRef.current = 0;
    hasStartedRef.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  return {
    displayedText,
    isTyping,
    startTyping,
    stopTyping,
    resetTyping
  };
};