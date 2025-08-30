// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Valid credentials - easily changeable
const VALID_CREDENTIALS = [
  { email: "francisgbohunmi@gmail.com", password: "4613732518" },
  { email: "realdiamonddigital@gmail.com", password: "Password1234" },
  { email: "tolludare@yahoo.com", password: "tolludare2."}
];

interface User {
  email: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app start
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const authData = localStorage.getItem('glazion_auth');
        if (authData) {
          const { email, timestamp } = JSON.parse(authData);
          
          // Check if auth is still valid (optional: add expiration)
          const now = Date.now();
          const authAge = now - timestamp;
          const maxAge = 60 * 60 * 1000; // an hour
          
          if (authAge < maxAge && email) {
            setUser({ email, isAuthenticated: true });
          } else {
            // Auth expired, clear it
            localStorage.removeItem('glazion_auth');
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        localStorage.removeItem('glazion_auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check credentials
      const isValid = VALID_CREDENTIALS.some(
        cred => cred.email.toLowerCase() === email.toLowerCase().trim() && 
                cred.password === password
      );
      
      if (isValid) {
        const userData = { email: email.toLowerCase().trim(), isAuthenticated: true };
        setUser(userData);
        
        // Store auth data with timestamp
        localStorage.setItem('glazion_auth', JSON.stringify({
          email: userData.email,
          timestamp: Date.now()
        }));
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('glazion_auth');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user?.isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protecting routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return null; // This will be handled by the main App routing
    }
    
    return <Component {...props} />;
  };
};