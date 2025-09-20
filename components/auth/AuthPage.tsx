
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { validateApiKey } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';

type AuthView = 'providers' | 'email_login' | 'email_signup';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
        s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
        s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
        C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
        c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238
        C43.021,36.251,44,30.686,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

const RobloxLogo = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.14,3.23l-3.88,1.25l1.2,3.71l3.89,-1.25l-1.21,-3.71M12,2A2,2 0 0,0 10.23,3.77L6.34,15.03L2.91,16.2A2,2 0 0,0 1.25,18.25L4.8,20.94A2,2 0 0,0 6.85,21.36L18.1,17.47L21.53,16.3A2,2 0 0,0 23.19,14.25L19.64,11.56A2,2 0 0,0 17.59,11.14L6.34,15.03L9.77,3.8A2,2 0 0,0 8.11,1.75L4.56,4.44A2,2 0 0,0 2.5,4A2,2 0 0,0 2.08,5.88L5.5,17.1L4.8,20.94L18.1,17.47L12.14,3.23Z" />
    </svg>
);

export const AuthPage: React.FC = () => {
  const { session, signInWithGoogle, signInWithPassword, signUpWithEmail, setGeminiApiKey } = useAuth();
  
  const [view, setView] = useState<AuthView>('providers');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [geminiKey, setGeminiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAuthAction = async (action: 'login' | 'signup') => {
    if (!email.trim() || !password.trim() || isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
        if (action === 'login') {
            await signInWithPassword(email, password);
        } else {
            await signUpWithEmail(email, password);
        }
    } catch (error) {
        setAuthError((error as Error).message || 'An unexpected error occurred.');
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleGeminiKeySave = async () => {
    if (!geminiKey.trim() || isValidating) return;

    setIsValidating(true);
    setValidationError(null);

    const isValid = await validateApiKey(geminiKey);

    if (isValid) {
      setGeminiApiKey(geminiKey);
    } else {
      setValidationError('Invalid API Key. Please check the key and try again.');
      setGeminiKey('');
    }
    setIsValidating(false);
  };
  
  const handleGeminiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeminiKey(e.target.value);
    if(validationError) {
        setValidationError(null);
    }
  }

  const renderAuthContent = () => {
      switch(view) {
          case 'email_login':
          case 'email_signup':
              return (
                  <motion.div key={view} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <button onClick={() => { setView('providers'); setAuthError(null); }} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
                          <ArrowLeftIcon className="w-4 h-4" />
                          Back to all options
                      </button>
                      <h3 className="text-xl font-semibold text-white mb-4">{view === 'email_login' ? 'Sign in with Email' : 'Create an Account'}</h3>
                      <div className="space-y-4">
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-start" />
                          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-start" />
                          <button
                            onClick={() => handleAuthAction(view === 'email_login' ? 'login' : 'signup')}
                            disabled={isAuthLoading}
                            className="w-full px-4 py-2.5 bg-primary-start text-white rounded-lg font-semibold hover:bg-primary-start/80 transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                            {isAuthLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (view === 'email_login' ? 'Sign In' : 'Sign Up')}
                          </button>
                      </div>
                      <p className="text-sm text-center mt-4 text-gray-400">
                          {view === 'email_login' ? "Don't have an account?" : 'Already have an account?'}
                          <button onClick={() => setView(view === 'email_login' ? 'email_signup' : 'email_login')} className="font-semibold text-primary-start/80 hover:text-primary-start ml-1">
                              {view === 'email_login' ? 'Sign Up' : 'Sign In'}
                          </button>
                      </p>
                  </motion.div>
              );
          case 'providers':
          default:
              return (
                  <motion.div key="providers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <p className="text-gray-400 mb-6 text-center">Please log in to continue.</p>
                      <button onClick={() => setView('email_login')} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-white rounded-lg font-semibold transition-all duration-200 bg-white/10 hover:bg-white/20">
                          Sign in with Email
                      </button>
                      <button onClick={signInWithGoogle} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-black bg-white rounded-lg font-semibold transition-all duration-200 hover:bg-gray-200">
                          <GoogleIcon />
                          <span>Sign in with Google</span>
                      </button>
                      <button disabled className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-white rounded-lg font-semibold bg-zinc-800/50 cursor-not-allowed opacity-60 relative overflow-hidden">
                          <RobloxLogo />
                          <span>Sign in with Roblox</span>
                          <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-900/50 px-1.5 py-0.5 rounded">COMING SOON</span>
                      </button>
                  </motion.div>
              );
      }
  }

  const renderGeminiKeyContent = () => {
    return (
        <motion.div initial={{ opacity: 0}} animate={{opacity: 1}}>
            <p className="text-gray-400 mb-6">Last step! Enter your Gemini API Key to start building.</p>
            <div className="flex items-center space-x-2">
                <input
                type="password"
                value={geminiKey}
                onChange={handleGeminiKeyChange}
                placeholder="Enter your Gemini API Key"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${validationError ? 'border-red-500/50 focus:ring-red-500' : 'border-white/20 focus:ring-primary-start'}`}
                />
                <button
                onClick={handleGeminiKeySave}
                disabled={!geminiKey.trim() || isValidating}
                className="px-4 py-3 bg-primary-start text-white rounded-lg font-semibold hover:bg-primary-start/80 transition-colors disabled:opacity-50 w-24 flex items-center justify-center"
                >
                {isValidating ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : 'Save'}
                </button>
            </div>
            {validationError && (
                <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-2 text-left flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {validationError}
                </motion.p>
            )}
        </motion.div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/50 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md p-8 bg-bg-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="flex justify-center items-center space-x-2.5 mb-4">
            <span className="text-3xl">🫧</span>
            <h2 className="text-3xl font-bold tracking-wider text-white">Bubble</h2>
        </div>
        
        <AnimatePresence mode="wait">
            <div className="relative">
                {authError && (
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-400 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-md">
                        {authError}
                    </motion.p>
                )}
                {!session ? renderAuthContent() : renderGeminiKeyContent()}
            </div>
        </AnimatePresence>
        
        <p className="text-xs text-gray-500 mt-6 text-center">
            Your credentials are secure and handled by Supabase authentication.
        </p>
      </motion.div>
    </div>
  );
};
