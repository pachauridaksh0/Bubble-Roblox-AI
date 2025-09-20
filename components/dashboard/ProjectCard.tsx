import React from 'react';
import { motion } from 'framer-motion';
import { Project } from '../../types';
import { PuzzlePieceIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/solid';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
}

const statusColors: { [key in Project['status']]: string } = {
    'In Progress': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    'Archived': 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

// A simple utility to format time difference
const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};


export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect }) => {
  return (
    <motion.div
      onClick={() => onSelect(project)}
      className="group cursor-pointer bg-bg-secondary rounded-xl p-5 border border-bg-tertiary hover:border-primary-start transition-all duration-200 flex flex-col"
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <PuzzlePieceIcon className="w-7 h-7 text-gray-400" />
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[project.status]}`}>
            {project.status}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold text-white mb-1">{project.name}</h3>
        <p className="text-sm text-gray-400 h-10 line-clamp-2">{project.description}</p>
      </div>

      <div className="border-t border-bg-tertiary mt-4 pt-4 flex justify-between items-center text-xs text-gray-500">
        <span>Modified {timeAgo(project.updated_at)}</span>
        {/* Messages count can be added back if chat history is loaded here */}
      </div>
    </motion.div>
  );
};