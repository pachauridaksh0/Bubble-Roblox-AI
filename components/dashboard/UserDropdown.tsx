import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Cog6ToothIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

interface UserDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsClick?: () => void;
    onLogout?: () => void;
    isAdminView?: boolean;
    onExitAdmin?: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ 
    isOpen, 
    onClose, 
    onSettingsClick, 
    onLogout, 
    isAdminView = false, 
    onExitAdmin 
}) => {
    const { user, profile } = useAuth();

    const handleSettings = () => {
        onSettingsClick?.();
        onClose();
    }

    const handleLogout = () => {
        onLogout?.();
        onClose();
    }

    const handleExitAdmin = () => {
        onExitAdmin?.();
        onClose();
    }
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-64 bg-bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                    <div className="p-4 border-b border-white/10">
                        <p className="font-semibold text-white truncate">{profile?.roblox_username || 'User'}</p>
                        <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                        {isAdminView ? (
                            <button onClick={handleExitAdmin} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error rounded-md hover:bg-error/20 hover:text-red-300 transition-colors">
                                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                                <span>Exit Admin Mode</span>
                            </button>
                        ) : (
                            <>
                                <button onClick={handleSettings} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                                    <Cog6ToothIcon className="w-5 h-5" />
                                    <span>Settings</span>
                                </button>
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                                    <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
