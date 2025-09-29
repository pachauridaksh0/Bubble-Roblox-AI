

import React from 'react';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { ProjectCard } from '../dashboard/ProjectCard';
import { Project, Profile } from '../../types';

interface ProjectsPageProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProjectClick: () => void;
  isLoading: boolean;
  profile: Profile | null;
  error: string | null;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ projects, onSelectProject, onNewProjectClick, isLoading, profile, error }) => {
  const displayName = profile?.roblox_username?.split(' ')[0] || 'there';

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-8">
              <ExclamationTriangleIcon className="w-12 h-12 text-error mb-4" />
              <h2 className="text-xl font-semibold text-white">Could Not Load Projects</h2>
              <p className="text-gray-400 max-w-md">{error}</p>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-4 text-center md:flex-row md:text-left md:justify-between md:items-center mb-8">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Welcome back, {displayName}!</h1>
            <p className="text-gray-400 mt-1">Select a project to start building or create a new one.</p>
        </div>
        <button 
          onClick={onNewProjectClick}
          className="bg-gradient-to-r from-primary-start to-primary-end text-white font-semibold px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:shadow-lg hover:shadow-primary-start/20 transition-all duration-200 transform hover:scale-105 flex-shrink-0">
            <PlusIcon className="w-5 h-5" />
            <span>New Project</span>
        </button>
      </div>

        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-bg-secondary rounded-xl p-5 border border-bg-tertiary animate-pulse">
                        <div className="flex justify-between items-start mb-4">
                             <div className="w-12 h-12 rounded-lg bg-bg-tertiary"></div>
                             <div className="w-20 h-6 rounded-full bg-bg-tertiary"></div>
                        </div>
                        <div className="h-6 w-3/4 bg-bg-tertiary rounded mb-2"></div>
                        <div className="h-4 w-full bg-bg-tertiary rounded"></div>
                        <div className="h-4 w-1/2 bg-bg-tertiary rounded mt-1"></div>
                        <div className="border-t border-bg-tertiary mt-4 pt-4">
                             <div className="h-4 w-1/3 bg-bg-tertiary rounded"></div>
                        </div>
                    </div>
                 ))}
             </div>
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <motion.div
                    onClick={onNewProjectClick}
                    className="group cursor-pointer border-2 border-dashed border-bg-tertiary rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary-start hover:bg-bg-secondary transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="w-16 h-16 rounded-full bg-bg-secondary group-hover:bg-primary-start/20 flex items-center justify-center mb-4 transition-colors">
                        <PlusIcon className="w-8 h-8 text-gray-400 group-hover:text-primary-start transition-colors" />
                    </div>
                    <h3 className="font-semibold text-white">Create New Project</h3>
                    <p className="text-sm text-gray-400">Start building something amazing</p>
                </motion.div>

                {projects.map(project => (
                    <ProjectCard key={project.id} project={project} onSelect={onSelectProject} />
                ))}
            </div>
        )}
    </div>
  );
};