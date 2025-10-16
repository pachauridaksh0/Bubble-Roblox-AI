import React from 'react';
import { FolderIcon, DocumentIcon } from '@heroicons/react/24/outline';

const mockFiles = [
    { name: 'ServerScriptService', type: 'folder', children: [
        { name: 'MainGameLoop.server.lua', type: 'file' },
        { name: 'PlayerManager.server.lua', type: 'file' },
    ]},
    { name: 'ReplicatedStorage', type: 'folder', children: [
        { name: 'SharedModules', type: 'folder', children: [
            { name: 'DataManager.lua', type: 'file' },
            { name: 'EffectManager.lua', type: 'file' },
        ]},
        { name: 'Assets', type: 'folder', children: [] }
    ]},
    { name: 'StarterPlayer', type: 'folder', children: [
        { name: 'StarterPlayerScripts', type: 'folder', children: [
            { name: 'MainController.client.lua', type: 'file' },
        ]}
    ]},
];

interface FileTreeProps {
    files: any[];
    level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ files, level = 0 }) => {
    return (
        <div>
            {files.map(file => (
                <div key={file.name} style={{ paddingLeft: `${level * 16}px` }}>
                    <div className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-white/5 cursor-pointer">
                        {file.type === 'folder' 
                            ? <FolderIcon className="w-5 h-5 text-gray-400 flex-shrink-0" /> 
                            : <DocumentIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        }
                        <span className="text-sm text-gray-300 truncate">{file.name}</span>
                    </div>
                    {file.children && file.children.length > 0 && (
                        <FileTree files={file.children} level={level + 1} />
                    )}
                </div>
            ))}
        </div>
    );
};

export const FileExplorer: React.FC = () => {
  return (
    <div className="bg-bg-secondary h-full flex flex-col p-2">
      <h2 className="text-lg font-semibold text-white p-2 mb-2">Workspace</h2>
      <div className="flex-1 overflow-y-auto">
        <FileTree files={mockFiles} />
      </div>
    </div>
  );
};
