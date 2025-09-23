

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllProfiles, updateProfileForAdmin } from '../../services/databaseService';
import { Profile } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminConfirmationModal } from './AdminConfirmationModal';
import {
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon,
    NoSymbolIcon,
    ShieldExclamationIcon,
    ArrowUturnLeftIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';


const FALLBACK_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23334155'/%3E%3Cpath d='M50 42 C61.046 42 70 50.954 70 62 L30 62 C30 50.954 38.954 42 50 42 Z' fill='white'/%3E%3Ccircle cx='50' cy='30' r='10' fill='white'/%3E%3C/svg%3E`;

type ActionType = 'ban' | 'unban' | 'admin' | 'unadmin';

const UserCard: React.FC<{ profile: Profile; onRequestAction: (actionType: ActionType, profile: Profile) => void }> = ({ profile, onRequestAction }) => {
    const { impersonateUser } = useAuth();

    const { role, status, ban_reason } = profile;
    const isBanned = status === 'banned';
    const isAdmin = role === 'admin';

    const handleToggleAdmin = () => {
        onRequestAction(isAdmin ? 'unadmin' : 'admin', profile);
    };

    const handleToggleBan = () => {
        onRequestAction(isBanned ? 'unban' : 'ban', profile);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`bg-bg-secondary rounded-xl p-4 border border-bg-tertiary flex flex-col transition-all duration-300 ${isBanned ? 'opacity-50 grayscale' : ''}`}
        >
            <div className="flex items-start gap-4 mb-4">
                <img
                    src={profile.avatar_url || FALLBACK_AVATAR_SVG}
                    alt={`${profile.roblox_username}'s avatar`}
                    className="w-16 h-16 rounded-full object-cover bg-bg-tertiary flex-shrink-0"
                />
                <div className="overflow-hidden flex-1">
                    <h3 className="text-lg font-bold text-white truncate">{profile.roblox_username}</h3>
                    <p className="text-sm text-gray-400 truncate" title={profile.id}>
                        ID: {profile.id.split('-')[0]}...
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {isAdmin && !isBanned && (
                         <div title="Administrator" className="flex-shrink-0 p-1.5 bg-primary-start/20 text-primary-start rounded-full">
                            <ShieldCheckIcon className="w-5 h-5"/>
                         </div>
                    )}
                    {isBanned && (
                         <div title={`Banned: ${ban_reason || 'No reason provided.'}`} className="flex-shrink-0 p-1.5 bg-error/20 text-error rounded-full">
                            <NoSymbolIcon className="w-5 h-5"/>
                         </div>
                    )}
                </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2 text-sm">
                <button
                    onClick={() => impersonateUser(profile)}
                    className="col-span-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 text-gray-300 rounded-md hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isBanned}
                >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Impersonate</span>
                </button>
                <button
                    onClick={handleToggleBan}
                    className={`col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${isBanned ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-error/10 text-error hover:bg-error/20'}`}
                >
                    {isBanned ? <ArrowUturnLeftIcon className="w-4 h-4"/> : <NoSymbolIcon className="w-4 h-4"/>}
                    <span>{isBanned ? 'Unban' : 'Ban'}</span>
                </button>
                 <button
                    onClick={handleToggleAdmin}
                    className={`col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isAdmin ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-primary-start/10 text-primary-start hover:bg-primary-start/20'}`}
                    disabled={isBanned}
                >
                    {isAdmin ? <ShieldExclamationIcon className="w-4 h-4"/> : <ShieldCheckIcon className="w-4 h-4"/>}
                    <span>{isAdmin ? 'Revoke' : 'Admin'}</span>
                </button>
            </div>
        </motion.div>
    );
};

export const AdminUsersPage: React.FC = () => {
    const { supabase } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<any>(null);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

    const fetchProfiles = useCallback(async () => {
        try {
            const data = await getAllProfiles(supabase);
            setProfiles(data);
        } catch (err) {
            setError('Failed to fetch user profiles.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        // Initial fetch
        fetchProfiles();
        
        // Set up real-time subscription
        const channel = supabase
            .channel('profiles-realtime-admin')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                // On any change, refetch the entire list to ensure data is always fresh.
                // This is more robust than trying to patch the state manually.
                () => fetchProfiles()
            )
            .subscribe();

        // Cleanup function to remove the subscription
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchProfiles]);

    const handleRequestAction = (actionType: ActionType, profile: Profile) => {
        setSelectedProfile(profile);
        switch (actionType) {
            case 'ban':
                setModalConfig({
                    title: `Ban ${profile.roblox_username}?`,
                    message: 'Banned users will not be able to log in. You can provide a reason for the ban below, which will be visible to other admins.',
                    confirmText: 'Yes, ban user',
                    confirmClassName: 'bg-red-600 text-white hover:bg-red-700',
                    needsReasonInput: true,
                    initialReason: profile.ban_reason
                });
                break;
            case 'unban':
                setModalConfig({
                    title: `Unban ${profile.roblox_username}?`,
                    message: 'This will restore their access to the application. Their ban reason will be cleared.',
                    confirmText: 'Yes, unban user',
                    confirmClassName: 'bg-green-600 text-white hover:bg-green-700'
                });
                break;
            case 'admin':
                 setModalConfig({
                    title: `Make ${profile.roblox_username} an admin?`,
                    message: 'Administrators have access to all user data and administrative functions. This action cannot be undone easily.',
                    confirmText: 'Yes, grant admin',
                    confirmClassName: 'bg-indigo-600 text-white hover:bg-indigo-700'
                });
                break;
            case 'unadmin':
                 setModalConfig({
                    title: `Revoke admin for ${profile.roblox_username}?`,
                    message: 'This will remove their administrative privileges. They will revert to a standard user role.',
                    confirmText: 'Yes, revoke admin',
                    confirmClassName: 'bg-amber-600 text-white hover:bg-amber-700'
                });
                break;
        }
        setIsModalOpen(true);
    };

    const handleConfirmAction = async (reason?: string) => {
        if (!selectedProfile || !modalConfig) return;

        let updates: Partial<Profile> = {};
        if (modalConfig.title.includes('Ban')) {
            updates = { status: 'banned', ban_reason: reason || null };
        } else if (modalConfig.title.includes('Unban')) {
            updates = { status: 'active', ban_reason: null };
        } else if (modalConfig.title.includes('Make')) {
            updates = { role: 'admin' };
        } else if (modalConfig.title.includes('Revoke')) {
            updates = { role: 'user' };
        }

        try {
            // The realtime subscription will handle the UI update automatically after this query succeeds.
            await updateProfileForAdmin(supabase, selectedProfile.id, updates);
        } catch (err) {
            alert(`Failed to update profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsModalOpen(false);
            setSelectedProfile(null);
            setModalConfig(null);
        }
    };
    
    const filteredProfiles = useMemo(() => {
        if (!searchQuery) return profiles;
        return profiles.filter(p =>
            p.roblox_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [profiles, searchQuery]);


    if (isLoading) {
        return (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-bg-secondary rounded-xl p-4 border border-bg-tertiary animate-pulse">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-bg-tertiary"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-6 w-3/4 bg-bg-tertiary rounded"></div>
                                <div className="h-4 w-1/2 bg-bg-tertiary rounded"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="h-9 bg-bg-tertiary rounded-md"></div>
                            <div className="h-9 bg-bg-tertiary rounded-md"></div>
                            <div className="h-9 bg-bg-tertiary rounded-md"></div>
                        </div>
                    </div>
                 ))}
             </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-error mb-4" />
                <h2 className="text-xl font-semibold text-white">An Error Occurred</h2>
                <p className="text-gray-400">{error}</p>
            </div>
        );
    }
    
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">All Users</h1>
                    <p className="text-gray-400 mt-1">{profiles.length} total users</p>
                </div>
                <div className="relative w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-bg-secondary/50 border border-bg-tertiary rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-start"
                    />
                </div>
            </div>
            
            <AnimatePresence>
                {filteredProfiles.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {filteredProfiles.map(profile => (
                            <UserCard key={profile.id} profile={profile} onRequestAction={handleRequestAction} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-semibold text-white">No Users Found</h3>
                        <p className="text-gray-500">Your search for "{searchQuery}" did not match any users.</p>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AdminConfirmationModal
                isOpen={isModalOpen}
                config={modalConfig}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmAction}
            />
        </div>
    );
};
