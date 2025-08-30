// src/pages/Logout.tsx - Updated with real authentication
import React, { useEffect } from 'react';
import { CheckCircle, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Logout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout, user } = useAuth();

  useEffect(() => {
    // Perform logout immediately when component mounts
    const handleLogout = async () => {
      logout();
      
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out of GlazionStudio.",
      });
    };

    handleLogout();
  }, [logout, toast]);

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleSignInAgain = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold text-foreground mb-3">
            You're all set!
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Thanks for using GlazionStudio. You've been securely logged out.
            {user?.email && (
              <span className="block mt-2 text-sm">
                Session ended for {user.email}
              </span>
            )}
          </p>

          {/* Actions */}
          <div className="space-y-4">
            <Button
              onClick={handleSignInAgain}
              className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-2xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign In Again
            </Button>
            
            <Button
              onClick={handleReturnHome}
              variant="outline"
              className="w-full h-14 border-border hover:bg-accent rounded-2xl font-medium text-base transition-all duration-300"
            >
              Return to home
            </Button>
          </div>
          
          {/* Footer Info */}
          <div className="mt-8 p-4 bg-accent/10 rounded-2xl">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Your session data has been cleared for security. Thanks for using GlazionStudio!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logout;