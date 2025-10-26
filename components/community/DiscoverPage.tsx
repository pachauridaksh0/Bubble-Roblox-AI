import React from 'react';
import { motion } from 'framer-motion';
import { UsersIcon } from '@heroicons/react/24/outline';

export const DiscoverPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-white bg-bg-primary">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, duration: 0.8 }}
                className="flex flex-col items-center"
            >
                <UsersIcon className="w-20 h-20 text-primary-start/50 mb-6" />
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-4">
                    Discover Creators
                </h1>
                <p className="text-lg text-gray-400 max-w-md">
                    Coming soon! Find and connect with other talented developers, view their profiles, and explore their public projects.
                </p>
            </motion.div>
        </div>
    );
};