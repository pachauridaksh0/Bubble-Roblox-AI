
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ArrowLeftIcon, 
    KeyIcon, 
    LinkIcon, 
    ArrowLeftOnRectangleIcon, 
    CheckCircleIcon 
} from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { validateApiKey } from '../../services/geminiService';

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

const Section: React.FC<{title: string; description: string; children: React.ReactNode}> = ({ title, description, children }) => (
    <div className="p-6 bg-bg-secondary rounded-xl border border-white/10">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-gray-400 mt-1 mb-6">{description}</p>
        {children}
    </div>
);

export const SettingsPage: React.FC<{onBack: () => void}> = ({ onBack }) => {
    const { profile, providers, updateUserProfile, geminiApiKey, signOut, saveGeminiApiKey, signInWithGoogle, signInWithRoblox } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [keyToUpdate, setKeyToUpdate] = useState('');
    const [isUpdatingKey, setIsUpdatingKey] = useState(false);
    const [keyUpdateSuccess, setKeyUpdateSuccess] = useState(false);
    const [keyUpdateError, setKeyUpdateError] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.roblox_username || '');
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!displayName.trim() || displayName === profile?.roblox_username || isSaving) return;
        setIsSaving(true);
        try {
            await updateUserProfile({ roblox_username: displayName.trim() });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleUpdateKey = async () => {
        if (!keyToUpdate.trim() || isUpdatingKey) return;
        setIsUpdatingKey(true);
        setKeyUpdateError(null);
        setKeyUpdateSuccess(false);
        try {
            const isValid = await validateApiKey(keyToUpdate);
            if (!isValid) {
                throw new Error("The new API key appears to be invalid.");
            }
            await saveGeminiApiKey(keyToUpdate);
            setKeyUpdateSuccess(true);
            setKeyToUpdate('');
            setTimeout(() => setKeyUpdateSuccess(false), 2000);
        } catch (error) {
            // FIX: Improved error handling to correctly display messages from Supabase errors.
            const errorMessage = (error && typeof error === 'object' && 'message' in error)
                ? (error as { message: string }).message
                : "An unknown error occurred.";
            setKeyUpdateError(errorMessage);
        } finally {
            setIsUpdatingKey(false);
        }
    };
    
    const copyApiKey = () => {
        if (geminiApiKey) {
            navigator.clipboard.writeText(geminiApiKey);
        }
    };

    const maskedApiKey = geminiApiKey ? (isKeyVisible ? geminiApiKey : `sk-....${geminiApiKey.slice(-4)}`) : 'Not Set';
    const providerDetails = [
        { name: 'google', Icon: GoogleIcon, isLinked: providers.includes('google'), action: signInWithGoogle, label: 'Google' },
        { name: 'roblox', Icon: RobloxLogo, isLinked: providers.includes('roblox'), action: signInWithRoblox, label: 'Roblox' },
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboard</span>
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400 mb-8">Manage your account and preferences.</p>

            <div className="space-y-6">
                <Section title="Profile" description="Update your public profile information.">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-start"
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving || saveSuccess || !displayName.trim() || displayName === profile?.roblox_username}
                            className="self-end px-5 h-[42px] bg-primary-start text-white rounded-md font-semibold text-sm hover:bg-primary-start/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 w-24 flex items-center justify-center"
                        >
                           {isSaving ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : saveSuccess ? (
                                <CheckCircleIcon className="h-6 w-6 text-white" />
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </Section>

                <Section title="Linked Accounts" description="Connect other accounts to enhance your experience.">
                     <div className="space-y-3">
                        {providerDetails.map(({ name, Icon, isLinked, action, label }) => (
                            <div key={name} className="flex items-center justify-between p-3 bg-black/20 rounded-md">
                                <div className="flex items-center gap-4">
                                    <Icon />
                                    <span className="font-medium text-white text-lg">{label}</span>
                                     {name === 'roblox' && !isLinked && (
                                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-900/50 px-1.5 py-0.5 rounded">COMING SOON</span>
                                    )}
                                </div>
                                {isLinked ? (
                                    <span className="text-sm text-success font-semibold px-3 py-1 bg-success/10 rounded-md">Linked</span>
                                ) : (
                                    <button 
                                        onClick={action || undefined}
                                        disabled={!action}
                                        className="px-4 py-1.5 text-sm font-semibold bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Link Account
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>
                
                 <Section title="API Keys" description="Manage your API keys for third-party services.">
                    <div className="p-3 bg-black/20 rounded-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <KeyIcon className="w-6 h-6 text-yellow-400"/>
                                <div>
                                    <p className="font-medium text-white">Google Gemini API Key</p>
                                    <p className="font-mono text-sm text-gray-400">{maskedApiKey}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsKeyVisible(!isKeyVisible)} className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white rounded-md hover:bg-white/20">
                                    {isKeyVisible ? 'Hide' : 'Show'}
                                </button>
                                <button onClick={copyApiKey} disabled={!geminiApiKey} className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50">
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Update API Key</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="password"
                                    placeholder="Enter new Gemini API key"
                                    value={keyToUpdate}
                                    onChange={(e) => { setKeyToUpdate(e.target.value); setKeyUpdateError(null); }}
                                    className="flex-grow px-3 py-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-start"
                                />
                                <button
                                    onClick={handleUpdateKey}
                                    disabled={isUpdatingKey || keyUpdateSuccess || !keyToUpdate.trim()}
                                    className="self-end px-4 h-[42px] bg-primary-start text-white rounded-md font-semibold text-sm hover:bg-primary-start/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 w-24 flex items-center justify-center"
                                >
                                    {isUpdatingKey ? (
                                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : keyUpdateSuccess ? (
                                        <CheckCircleIcon className="h-6 w-6 text-white" />
                                    ) : 'Save'}
                                </button>
                            </div>
                            {keyUpdateError && <p className="text-red-400 text-xs mt-2">{keyUpdateError}</p>}
                        </div>
                    </div>
                </Section>

                <div className="pt-4">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-error/20 text-error hover:bg-error/40 hover:text-red-300 rounded-lg transition-colors"
                        >
                        <ArrowLeftOnRectangleIcon className="w-5 h-5"/>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
