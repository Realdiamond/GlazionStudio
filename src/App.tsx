/**
 * Main App Component for GlazionStudio - WITH AUTHENTICATION
 * 
 * This version includes:
 * - Authentication provider
 * - Route protection (redirects to login if not authenticated)
 * - All routes protected except login/logout
 */

import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import AppShell from './layouts/AppShell';
import HybridLayout from './layouts/HybridLayout';
import RecipesToImage from './pages/RecipesToImage';
import ImageToRecipes from './pages/ImageToRecipes';
import UMFCalculator from './pages/UMFCalculator';

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Error Boundary Component
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
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error caught by boundary:', error, errorInfo);
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
 * Protected Route Component - Redirects to login if not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Main App Routes Component
 */
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes - Login/Logout */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route path="/logout" element={<Logout />} />
      
      {/* Protected Routes - All main app pages */}
      <Route 
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route element={<HybridLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/recipes-to-image" element={<RecipesToImage />} />
          <Route path="/image-to-recipes" element={<ImageToRecipes />} />
          <Route path="/umf-calculator" element={<UMFCalculator />} />
        </Route>
      </Route>
      
      {/* Catch-all - Redirect to login if not authenticated, otherwise 404 */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? <NotFound /> : <Navigate to="/login" replace />
        } 
      />
    </Routes>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;