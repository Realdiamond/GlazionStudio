import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAdminEmail, setAdminSession } from "@/lib/adminAuth";
import { Lock, Mail, Edit2, Eye, EyeOff, AlertCircle } from "lucide-react";

const VERCEL_API_URL = "/api/auth";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    
    // Check if this email is an admin
    if (!isAdminEmail(email)) {
      setError("Access denied. You are not authorized to view this page.");
      return;
    }
    
    setError("");
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(VERCEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setAdminSession(email);
        navigate("/admin/investors");
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch (err) {
      setError("Login failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmail = () => {
    setStep("email");
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6 relative">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-3">
              {step === "email" ? "Admin Access" : "Almost there!"}
            </h1>
            
            {step === "email" ? (
              <p className="text-slate-400 leading-relaxed">
                Enter your credentials to access the administrator dashboard
              </p>
            ) : (
              <p className="text-slate-400">
                Complete your sign in to continue
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {step === "email" ? (
            <>
              {/* Email Step */}
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-base rounded-2xl border-slate-600 bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-amber-500 transition-all duration-300"
                    required
                    autoFocus
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-2xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  disabled={!isValidEmail(email)}
                >
                  Continue
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Password Step */}
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Email Display Field - Non-editable */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <div className="pl-12 pr-20 h-14 flex items-center rounded-2xl border border-slate-600 bg-slate-800/50 text-white">
                      {email}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleEditEmail}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 text-base rounded-2xl border-slate-600 bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-amber-500 transition-all duration-300 pr-12"
                      required
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-700/50 text-slate-400"
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
                  className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-2xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  disabled={loading || !password.trim()}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    "Access Dashboard"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              Authorized administrators only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
