import React, { useEffect } from 'react';
import { CheckCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Logout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Simulate logout process
    const handleLogout = async () => {
      // Clear any stored authentication data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out of your account.",
      });
    };

    handleLogout();
  }, [toast]);

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleSignInAgain = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            You're logged out
          </CardTitle>
          <CardDescription>
            Thanks for using GlazionStudio. You've been successfully logged out of your account.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={handleSignInAgain}
            className="w-full gradient-primary text-primary-foreground hover:opacity-90"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign In Again
          </Button>
          
          <Button
            onClick={handleReturnHome}
            variant="outline"
            className="w-full"
          >
            Return to Home
          </Button>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Your session data has been cleared for security.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logout;