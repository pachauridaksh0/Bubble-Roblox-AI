
import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export const SettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Cog6ToothIcon className="h-16 w-16 text-gray-500 mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-gray-400 max-w-md">
        Soon you'll be able to manage your account, API keys, and application preferences from this page. Stay tuned!
      </p>
    </div>
  );
};
