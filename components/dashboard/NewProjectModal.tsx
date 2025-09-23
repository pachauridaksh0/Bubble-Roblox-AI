

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { ProjectPlatform } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, platform: ProjectPlatform) => Promise<void>;
  isAdmin?: boolean;
}

const RobloxStudioIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="8" fill="#3E4557"/>
        <path d="M22.068 33.3339L14.6667 25.9326L22.068 18.5312L25.9326 14.6667L18.5312 22.068L11.1299 29.4693L14.6667 33.0061L11.1299 36.5429L14.6667 40.0797L29.4693 25.2771L36.8706 17.8757L29.4693 10.4744L25.6047 14.3388L29.4693 18.2034L33.0061 21.7402L25.6047 29.1415L22.068 32.6783L25.6047 29.1415" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const WebAppIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="8" fill="#3E4557"/>
        <path d="M16 15L32 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 24L32 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 33L24 33" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="10" y="9" width="28" height="30" rx="2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)


export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onCreateProject, isAdmin = false }) => {
  const [projectName, setProjectName] = useState('');
  const [platform, setPlatform] = useState<ProjectPlatform>('Roblox Studio');
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const { providers } = useAuth();
  
  useEffect(() => {
    // Reset state every time the modal opens
    if (isOpen) {
        setProjectName('');
        setPlatform('Roblox Studio');
        setIsCreating(false);
        setCreationError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || isCreating) return;

    setIsCreating(true);
    setCreationError(null);
    try {
      await onCreateProject(projectName, platform);
      onClose(); // On success, close the modal.
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setCreationError(`Failed to create project. Please try again. (Error: ${errorMessage})`);
    } finally {
      // Always stop the loading state, whether it succeeded or failed.
      setIsCreating(false);
    }
  };

  const isWebAppProviderLinked = providers.includes('google') || providers.includes('email');
  
  const canCreate = useMemo(() => {
    if (!projectName.trim() || isCreating) {
      return false;
    }
    // Admin can create any project.
    if (isAdmin) {
      return true;
    }
    // Any user can create a Roblox Studio project.
    if (platform === 'Roblox Studio') {
      return true;
    }
    // Only users with linked providers can create a Web App project.
    if (platform === 'Web App') {
      return isWebAppProviderLinked;
    }
    // Default to false if something is wrong.
    return false;
  }, [projectName, isCreating, isAdmin, platform, isWebAppProviderLinked]);


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full max-w-lg p-8 bg-bg-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Create New Project</h2>
            <p className="text-gray-400 mb-6">Give your project a name and choose a platform to start with.</p>
            
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                    <input
                      type="text"
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., My Awesome Obby"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-start transition-colors"
                      required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            onClick={() => setPlatform('Roblox Studio')}
                            className={`p-3 border-2 rounded-lg flex items-center space-x-4 cursor-pointer transition-colors ${platform === 'Roblox Studio' ? 'border-primary-start bg-primary-start/10' : 'border-white/20 hover:border-white/40 bg-white/5'}`}
                        >
                            <RobloxStudioIcon />
                            <div>
                                <h3 className="font-semibold text-white">Roblox Studio</h3>
                            </div>
                        </div>
                         <div 
                            onClick={() => setPlatform('Web App')}
                            className={`p-3 border-2 rounded-lg flex items-center space-x-4 cursor-pointer transition-colors ${platform === 'Web App' ? 'border-primary-start bg-primary-start/10' : 'border-white/20 hover:border-white/40 bg-white/5'}`}
                         >
                            <WebAppIcon />
                            <div>
                                <h3 className="font-semibold text-white">Web App</h3>
                            </div>
                        </div>
                    </div>
                </div>
                
                {creationError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg flex items-start gap-3 my-4">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                        <p>{creationError}</p>
                    </div>
                )}

                <button
                  type="submit"
                  disabled={!canCreate}
                  className="w-full h-[51px] flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-start to-primary-end text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-start/20 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : 'Continue'}
                </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};