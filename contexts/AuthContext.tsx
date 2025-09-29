
import React, { createContext, useState, useEffect, useContext } from 'react';
import type { Session, User, SupabaseClient, Provider } from '@supabase/supabase-js';
import { Profile } from '../types';
import { supabase } from '../supabaseClient'; // Import the centralized client
import { createProfile as createProfileInDb, updateProfile } from '../services/databaseService';

// --- Development Flag ---
// Set to true to bypass login and use mock data.
// Set to false for normal authentication flow.
const DEV_BYPASS_LOGIN = false;

interface AuthContextType {
    supabase: SupabaseClient;
    session: Session | null;
    user: User | null;
    profile: Profile | null | undefined; // Can be undefined during initial load
    profileError: string | null;
    providers: string[];
    loading: boolean;
    geminiApiKey: string | null;
    isAdmin: boolean;
    isImpersonating: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithRoblox: () => Promise<void>; // Kept for future use
    signInWithPassword: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
    saveGeminiApiKey: (key: string) => Promise<void>;
    // FIX: Expose setGeminiApiKey for admin session key setup.
    setGeminiApiKey: (key: string | null) => void;
    createProfile: (displayName: string) => Promise<void>;
    updateUserProfile: (updates: Partial<Profile>) => Promise<void>;
    loginAsAdmin: () => void;
    logoutAdmin: () => void;
    impersonateUser: (profileToImpersonate: Profile) => void;
    stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [providers, setProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [originalAdminState, setOriginalAdminState] = useState<{ session: Session; user: User; profile: Profile } | null>(null);

    useEffect(() => {
        if (DEV_BYPASS_LOGIN) {
            // Mock data for development
            const mockUser: User = {
                id: '11111111-1111-1111-1111-111111111111',
                app_metadata: { provider: 'email', providers: ['email'] },
                user_metadata: { name: 'Dev User' },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                email: 'dev@example.com'
            };
            const mockSession: Session = { access_token: 'mock-token', token_type: 'bearer', user: mockUser, refresh_token: 'mock-refresh', expires_in: 3600 };
            setSession(mockSession);
            setUser(mockUser);
            setProfile({ id: mockUser.id, roblox_id: 'mock', roblox_username: 'Dev User', avatar_url: '' });
            setGeminiApiKey('DUMMY_API_KEY_FOR_DEVELOPMENT');
            setLoading(false);
            return;
        }

        // This function fetches all user data and determines admin status from multiple sources.
        const resolveUserSession = async (currentSession: Session | null) => {
            if (originalAdminState) {
                setLoading(false); // Impersonation is synchronous, no loading needed.
                return;
            }

            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);
            setProviders(currentUser?.identities?.map(i => i.provider as string) ?? []);

            let userIsAdmin = false;

            // 1. Check for password-based admin login (via sessionStorage)
            if (sessionStorage.getItem('isAdmin') === 'true') {
                userIsAdmin = true;
            }

            // 2. Check for hardcoded admin email
            if (currentUser?.email === 'aadhavan.pachauri@gmail.com') {
                userIsAdmin = true;
            }

            if (currentUser) {
                try {
                    const { data: profileData, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUser.id)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
                        throw error;
                    }
                    setProfile(profileData);

                    // 3. Check for 'admin' role from the database profile
                    if (profileData?.role === 'admin') {
                        userIsAdmin = true;
                    }

                    setGeminiApiKey(profileData?.gemini_api_key || null);
                    setProfileError(null);
                } catch (error: any) {
                    // FIX: Refined error handling to provide more descriptive console logs
                    // and a more robust user-facing error message, resolving the "[object Object]" issue.
                    // We now inspect the error object for a 'message' property for cleaner logging.
                    const errorMessage = error?.message || 'An unknown error occurred.';
                    console.error("Error fetching profile:", errorMessage, { originalError: error });

                    if (errorMessage.includes('Failed to fetch')) {
                        setProfileError("We couldn't connect to our services to load your profile. Please check your internet connection and any browser extensions (like ad-blockers), then try again.");
                    } else {
                        // The error is not a simple network failure, so it might be something more serious
                        // like a database permissions issue (RLS). We provide a clear message about this possibility.
                        setProfileError("An unexpected error occurred while loading your profile. This can sometimes be caused by database permission issues (Row Level Security). Please contact support if this persists.");
                    }
                    setProfile(null);
                }
            } else {
                setProfile(null);
                setGeminiApiKey(null);
                // If there's no user, they can't be an admin. This is an important reset.
                userIsAdmin = false;
            }

            // Set the final admin state based on all checks
            setIsAdmin(userIsAdmin);

            // Crucially, set loading to false only after all async operations are done.
            setLoading(false);
        };

        // Initial load: set loading, then resolve session.
        setLoading(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            resolveUserSession(session);
        });

        // Listen for subsequent auth state changes.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                // Any auth change means we are in a loading state again until resolved.
                setLoading(true);
                resolveUserSession(session);
            }
        );

        return () => subscription.unsubscribe();
    }, [originalAdminState]);


    const signInWithProvider = async (provider: Provider) => {
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
    };

    const signOut = async () => {
        if (DEV_BYPASS_LOGIN) {
            console.log("DEV BYPASS: Signing out of mock session.");
        } else {
            await supabase.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setProfile(null);
        setProviders([]);
        setGeminiApiKey(null);
        if (isAdmin) {
          logoutAdmin();
        }
    };

    const saveGeminiApiKey = async (key: string) => {
        if (!user) throw new Error("User not authenticated.");
        try {
            await updateProfile(supabase, user.id, { gemini_api_key: key });
            setGeminiApiKey(key);
        } catch (error: any) {
            // Check for the specific Postgres error for a missing column
            if (error.message && error.message.includes('column "gemini_api_key" does not exist')) {
                // Log a detailed error for the developer in the console
                console.error("Database schema mismatch detected. The 'gemini_api_key' column is missing from the 'profiles' table. The developer needs to run the migration script.");
                // Throw a generic, user-friendly error to the UI
                throw new Error("Failed to save API key. The application's database may need to be updated.");
            }
            console.error("Failed to save API key:", error);
            throw error; // Re-throw other errors
        }
    };
    
    const createProfile = async (displayName: string) => {
        if (!user) throw new Error("User not authenticated.");
        setLoading(true);
        try {
            const avatarUrl = user.user_metadata.avatar_url || '';
            const newProfile = await createProfileInDb(supabase, user.id, displayName, avatarUrl);
            setProfile(newProfile);
        } catch (error) {
            console.error("Failed to create profile:", error);
            // Re-throw the error so the UI component can handle it
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateUserProfile = async (updates: Partial<Profile>) => {
        if (!user) throw new Error("User not authenticated.");
        try {
            const updatedProfile = await updateProfile(supabase, user.id, updates);
            setProfile(updatedProfile); // Update local state
        } catch (error) {
            console.error("Failed to update profile:", error);
            throw error; // Re-throw for UI component to handle
        }
    };

    const loginAsAdmin = () => {
        sessionStorage.setItem('isAdmin', 'true');
        setIsAdmin(true);
    };

    const logoutAdmin = () => {
        sessionStorage.removeItem('isAdmin');
        setIsAdmin(false);
    };

    const impersonateUser = (profileToImpersonate: Profile) => {
        if (!isAdmin || !session || !user || !profile) return;
        setOriginalAdminState({ session, user, profile });
        const impersonatedUser: User = { ...user, id: profileToImpersonate.id, email: `impersonating-${profileToImpersonate.id.substring(0, 8)}@bubble.ai`, user_metadata: { ...user.user_metadata, name: profileToImpersonate.roblox_username, avatar_url: profileToImpersonate.avatar_url }};
        const impersonatedSession: Session = { ...session, user: impersonatedUser };
        setSession(impersonatedSession);
        setUser(impersonatedUser);
        setProfile(profileToImpersonate);
        setGeminiApiKey(profileToImpersonate.gemini_api_key || null);
        setIsAdmin(false);
    };

    const stopImpersonating = () => {
        if (!originalAdminState) return;
        setSession(originalAdminState.session);
        setUser(originalAdminState.user);
        setProfile(originalAdminState.profile);
        setGeminiApiKey(originalAdminState.profile.gemini_api_key || null);
        setOriginalAdminState(null);
        setIsAdmin(true);
    };

    const value = {
        supabase,
        session,
        user,
        profile,
        profileError,
        providers,
        loading,
        geminiApiKey,
        isAdmin,
        isImpersonating: originalAdminState !== null,
        signInWithGoogle,
        signInWithRoblox,
        signInWithPassword,
        signUpWithEmail,
        signOut,
        saveGeminiApiKey,
        setGeminiApiKey,
        createProfile,
        updateUserProfile,
        loginAsAdmin,
        logoutAdmin,
        impersonateUser,
        stopImpersonating,
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
