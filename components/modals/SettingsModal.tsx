
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserCircleIcon, KeyIcon, ArrowLeftOnRectangleIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { Provider } from '@supabase/supabase-js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  geminiApiKey: string;
}

const GoogleIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 48 48">
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


export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onLogout, geminiApiKey }) => {
  const { profile, user, providers, signInWithGoogle, signInWithRoblox } = useAuth();
  const displayName = profile?.roblox_username || user?.email || 'User';
  const maskedApiKey = `****${geminiApiKey.slice(-4)}`;

  const providerDetails = [
    { name: 'email', Icon: EnvelopeIcon, isLinked: providers.includes('email'), action: null, label: 'Email' },
    { name: 'google', Icon: GoogleIcon, isLinked: providers.includes('google'), action: signInWithGoogle, label: 'Google' },
    { name: 'roblox', Icon: RobloxLogo, isLinked: providers.includes('roblox'), action: signInWithRoblox, label: 'Roblox' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full max-w-md p-6 bg-bg-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
            
            <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <UserCircleIcon className="w-6 h-6 text-gray-400"/>
                        <div>
                            <p className="text-sm text-gray-400">Logged in as</p>
                            <p className="font-semibold text-white">{displayName}</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-3">Linked Accounts</p>
                    <div className="space-y-2">
                        {providerDetails.map(({ name, Icon, isLinked, action, label }) => (
                            <div key={name} className="flex items-center justify-between p-2 bg-black/20 rounded-md">
                                <div className="flex items-center gap-3">
                                    <Icon />
                                    <span className="font-medium text-white">{label}</span>
                                    {name === 'roblox' && !isLinked && (
                                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-900/50 px-1.5 py-0.5 rounded">COMING SOON</span>
                                    )}
                                </div>
                                {isLinked ? (
                                    <span className="text-xs text-success font-semibold">Linked</span>
                                ) : (
                                    <button 
                                        onClick={action || undefined}
                                        disabled={!action}
                                        className="px-3 py-1 text-xs font-semibold bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Link
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                 <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <KeyIcon className="w-6 h-6 text-gray-400"/>
                        <div>
                            <p className="text-sm text-gray-400">Gemini API Key</p>
                            <p className="font-semibold text-white font-mono text-sm">{maskedApiKey}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <button
              onClick={onLogout}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-error/20 text-error hover:bg-error/40 hover:text-red-300 rounded-lg transition-colors"
            >
                <ArrowLeftOnRectangleIcon className="w-5 h-5"/>
                <span>Logout</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
