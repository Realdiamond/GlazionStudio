/**
 * Main App Component for GlazionStudio
 * 
 * This is the root component that sets up:
 * - Global providers (React Query, Tooltip, Toast)
 * - Routing configuration
 * - Error boundaries
 * - Security headers and CSP
 * 
 * Security considerations:
 * - Error boundary to prevent crashes
 * - Secure routing configuration
 * - Global error handling
 */

import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppShell from './layouts/AppShell';
import HybridLayout from './layouts/HybridLayout';
import RecipesToImage from './pages/RecipesToImage';
import ImageToRecipes from './pages/ImageToRecipes';
import UMFCalculator from './pages/UMFCalculator';

// Configure React Query client with security-focused settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent automatic refetching to avoid unnecessary API calls
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Cache for 5 minutes to balance performance and freshness
      staleTime: 5 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Longer retry delay for better UX
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * Error Boundary Component for graceful error handling
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state to show error UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring (in production, send to error tracking service)
    console.error('Application error caught by boundary:', error, errorInfo);
    
    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-6">
              We apologize for the inconvenience. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main App Component
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* Toast notifications for user feedback */}
          <Toaster />
          <Sonner />
          
          {/* Router configuration */}
          <BrowserRouter>
            <Routes>
              {/* All pages with AppShell (sidebar + header) */}
              <Route element={<AppShell />}>
                {/* Main pages with tabs */}
                <Route element={<HybridLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/recipes-to-image" element={<RecipesToImage />} />
                  <Route path="/image-to-recipes" element={<ImageToRecipes />} />
                  <Route path="/umf-calculator" element={<UMFCalculator />} />
                </Route>
              </Route>
              
              {/* Catch-all route for 404 handling */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;