import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login, register } from '../utils/api';
import { toast } from 'sonner';

const AuthPage = ({ loginUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(loginData);
      const { token, user } = response.data;
      loginUser(token, user);
      toast.success('Login successful!');
      
      // Check for pending quote
      const pendingQuote = localStorage.getItem('pendingQuote');
      
      if (user.is_admin) {
        navigate('/admin');
      } else if (pendingQuote) {
        navigate('/bulk-orders');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Ensure error message is always a string
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Login failed';
      
      // Check if user needs to register
      if (error.response?.status === 404) {
        toast.error(errorMessage, {
          duration: 5000,
          action: {
            label: 'Register',
            onClick: () => setIsLogin(false)
          }
        });
      } else if (errorMessage.includes('Google Sign-In')) {
        toast.error(errorMessage, {
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...dataToSend } = registerData;
      const response = await register(dataToSend);
      const { token, user } = response.data;
      
      // Automatically log the user in after registration
      loginUser(token, user);
      toast.success('Registration successful! Welcome to Temaruco!');
      
      // Check for pending quote
      const pendingQuote = localStorage.getItem('pendingQuote');
      
      // Redirect to bulk orders if there's a pending quote, otherwise dashboard
      if (pendingQuote) {
        navigate('/bulk-orders');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Ensure error message is always a string
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Registration failed';
      
      // Check if user is already registered
      if (errorMessage.includes('already registered')) {
        if (errorMessage.includes('Google Sign-In')) {
          // User registered with Google
          toast.error(errorMessage, {
            duration: 7000,
            description: 'Please use the "Sign in with Google" button above.'
          });
        } else {
          // User registered with email
          toast.error(errorMessage, {
            duration: 5000,
            action: {
              label: 'Go to Login',
              onClick: () => setIsLogin(true)
            }
          });
          // Auto-switch to login tab after a short delay
          setTimeout(() => setIsLogin(true), 2000);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-oswald text-4xl font-bold mb-2">TEMARUCO</h1>
          <p className="font-manrope text-zinc-600">Inspire • Empower • Accomplish</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex mb-6 bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md font-manrope font-semibold transition-all ${
                isLogin ? 'bg-white shadow-sm' : 'text-zinc-600'
              }`}
              data-testid="login-tab"
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md font-manrope font-semibold transition-all ${
                !isLogin ? 'bg-white shadow-sm' : 'text-zinc-600'
              }`}
              data-testid="register-tab"
            >
              Register
            </button>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all font-semibold"
                data-testid="google-login-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-zinc-500">Or continue with email</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> If you don't have an account yet, please{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-primary font-semibold underline hover:text-primary/80"
                    data-testid="switch-to-register"
                  >
                    register first
                  </button>
                  .
                </p>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="w-full"
                  placeholder="your@email.com"
                  data-testid="login-email"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full pr-12"
                    placeholder="••••••••"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    data-testid="toggle-login-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
                data-testid="login-submit"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
              {/* Google Sign Up Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all font-semibold"
                data-testid="google-register-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-zinc-500">Or register with email</span>
                </div>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={registerData.name}
                  onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                  className="w-full"
                  placeholder="John Doe"
                  data-testid="register-name"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  className="w-full"
                  placeholder="your@email.com"
                  data-testid="register-email"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Phone</label>
                <input
                  type="tel"
                  required
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                  className="w-full"
                  placeholder="+234 XXX XXX XXXX"
                  data-testid="register-phone"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="w-full pr-12"
                    placeholder="••••••••"
                    data-testid="register-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    data-testid="toggle-register-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    className="w-full pr-12"
                    placeholder="••••••••"
                    data-testid="register-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    data-testid="toggle-confirm-password"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
                data-testid="register-submit"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-zinc-600 hover:text-primary">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
