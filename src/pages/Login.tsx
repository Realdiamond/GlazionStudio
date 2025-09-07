// src/pages/Login.tsx - Updated with real authentication
import React, { useState } from 'react';
import { Mail, Edit2, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, isLoading } = useAuth();

  // Get the page user was trying to access (for redirect after login)
  const from = location.state?.from?.pathname || '/';

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    
    setLoginError('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const success = await login(email, password);
      
      if (success) {
        toast({
          title: "Welcome to GlazionStudio! ✨",
          description: "Your creative pottery journey continues...",
        });
        
        // Redirect to the page they were trying to access or home
        navigate(from, { replace: true });
      } else {
        setLoginError('Invalid email or password. Please check your credentials.');
        // Don't go back to email step, let them try password again
      }
    } catch (error) {
      setLoginError('Authentication failed. Please try again.');
      console.error('Login error:', error);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} login`,
      description: "Social authentication coming soon!",
    });
  };

  const handleEditEmail = () => {
    setStep('email');
    setPassword('');
    setLoginError('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6 relative">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
              {step === 'email' ? 'Welcome to GlazionStudio' : 'Almost there!'}
            </h1>
            
            {step === 'email' ? (
              <p className="text-muted-foreground leading-relaxed">
                Your intelligent pottery companion for recipes, glazes, and ceramic mastery
              </p>
            ) : (
              <p className="text-muted-foreground">
                Complete your sign in to continue
              </p>
            )}
          </div>

          {/* Error Display */}
          {loginError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">{loginError}</p>
              </div>
            </div>
          )}

          {step === 'email' ? (
            <>
              {/* Email Step */}
              <form onSubmit={handleEmailSubmit} className="space-y-6 mb-8">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-base rounded-2xl border-border bg-background focus:border-primary transition-all duration-300"
                    required
                    autoFocus
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-2xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  disabled={!isValidEmail(email)}
                >
                  Continue with Email
                </Button>
              </form>

              {/* Elegant Divider */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-6 text-sm text-muted-foreground font-medium">or continue with</span>
                </div>
              </div>

              {/* Social Login Options */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('Google')}
                  className="w-full h-14 border-border hover:bg-accent rounded-2xl font-medium text-base transition-all duration-300 justify-start px-6"
                >
                  <svg className="w-6 h-6 mr-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('Apple')}
                  className="w-full h-14 border-border hover:bg-accent rounded-2xl font-medium text-base transition-all duration-300 justify-start px-6"
                >
                  <svg className="w-6 h-6 mr-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 4.042c-.877 0-1.888-.522-2.516-1.261-.549-.65-.917-1.569-.762-2.481 1.21.044 2.667.827 3.296 1.566.55.65.874 1.566.719 2.481-.983-.044-1.737-.305-1.737-.305z"/>
                    <path d="M16.76 8.467c-2.205 0-2.577 1.043-4.1 1.043s-2.138-1.043-4.1-1.043c-1.709 0-3.513 1.084-4.67 2.927C2.06 14.495 3.99 20.454 6.5 20.454c.87 0 1.52-.435 2.414-.435.893 0 1.393.435 2.414.435 2.51 0 3.94-5.394 3.94-5.394s-2.49-.957-2.49-3.87c0-2.088 1.71-3.087 1.71-3.087s-1.394-.633-2.728-.633"/>
                  </svg>
                  Continue with Apple
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('Microsoft')}
                  className="w-full h-14 border-border hover:bg-accent rounded-2xl font-medium text-base transition-all duration-300 justify-start px-6"
                >
                  <svg className="w-6 h-6 mr-4" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M11.4 11.4H.6V.6h10.8v10.8z"/>
                    <path fill="#00A4EF" d="M23.4 11.4H12.6V.6h10.8v10.8z"/>
                    <path fill="#7FBA00" d="M11.4 23.4H.6V12.6h10.8v10.8z"/>
                    <path fill="#FFB900" d="M23.4 23.4H12.6V12.6h10.8v10.8z"/>
                  </svg>
                  Continue with Microsoft
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Password Step */}
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Email Display Field - Non-editable */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <div className="pl-12 pr-20 h-14 flex items-center rounded-2xl border border-border bg-accent/10 text-foreground">
                      {email}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleEditEmail}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/80 hover:bg-primary/10"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 text-base rounded-2xl border-border bg-background focus:border-primary transition-all duration-300 pr-12"
                      required
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent/50"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-2xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  disabled={isLoading || !password.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Signing you in...
                    </div>
                  ) : (
                    'Enter GlazionStudio'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground/80">
            Join thousands of ceramic artists crafting with AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;