
import React, { createContext, useState, useEffect, useContext } from 'react';
import type { Session, User, SupabaseClient, Provider, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { Profile } from '../types';
import { GEMINI_API_KEY_KEY } from '../constants';
import { supabase } from '../supabaseClient'; // Import the centralized client
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AuthContextType {
    supabase: SupabaseClient;
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    providers: string[];
    loading: boolean;
    geminiApiKey: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithRoblox: () => Promise<void>; // Kept for future use
    signInWithPassword: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
    setGeminiApiKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [providers, setProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string | null>(GEMINI_API_KEY_KEY, null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setProviders(session?.user?.identities?.map(i => i.provider) ?? []);
            setLoading(false);
        }
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setProviders(session?.user?.identities?.map(i => i.provider) ?? []);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // 'PGRST116' means no rows found
                    console.error('Error fetching profile:', error);
                } else if (data) {
                    setProfile(data);
                } else {
                    // Profile doesn't exist, let's create it from OAuth/user metadata
                    const provider = user.app_metadata.provider;
                    const newProfileData: Omit<Profile, 'id'> = {
                        roblox_id: user.id, // Using main user ID as fallback
                        roblox_username: user.email || 'New User', // Generic display name
                        avatar_url: '', // Default empty avatar
                    };

                    if (provider === 'google') {
                        newProfileData.roblox_username = user.user_metadata.full_name;
                        newProfileData.avatar_url = user.user_metadata.avatar_url;
                    } else if (provider === 'roblox') {
                        newProfileData.roblox_id = user.user_metadata.provider_id;
                        newProfileData.roblox_username = user.user_metadata.user_name;
                        newProfileData.avatar_url = user.user_metadata.avatar_url;
                    }
                    
                    const newProfile = { id: user.id, ...newProfileData };

                    const { data: createdProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert(newProfile)
                        .select()
                        .single();
                    
                    if (insertError) {
                         console.error('Error creating profile:', insertError);
                    } else {
                        setProfile(createdProfile);
                    }
                }
            } else if (!session) {
                setProfile(null);
            }
        };
        fetchProfile();
    }, [user, session]);

    const signInWithProvider = async (provider: Provider) => {
        // For Google, you need to enable the Google provider in your Supabase project settings.
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.origin,
            },
        });
    };
    
    const signInWithGoogle = () => signInWithProvider('google');
    const signInWithRoblox = () => signInWithProvider('roblox' as Provider);

    const signInWithPassword = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUpWithEmail = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // You might want to show a "Check your email to confirm" message here.
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setProviders([]);
    };

    const value = {
        supabase,
        session,
        user,
        profile,
        providers,
        loading,
        geminiApiKey,
        signInWithGoogle,
        signInWithRoblox,
        signInWithPassword,
        signUpWithEmail,
        signOut,
        setGeminiApiKey,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
