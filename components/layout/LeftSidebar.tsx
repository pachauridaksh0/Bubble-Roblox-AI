import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Message, TaskStatus } from '../../types';
import { FolderIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const getFileIcon = (status: TaskStatus) => {
    if (status === 'complete') {
        return <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />;
    }
    if (status === 'in-progress') {
        return (
             <svg className="animate-spin h-4 w-4 text-primary-start flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    }
    return <CodeBracketIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />;
}

const extractPath = (text: string): string | null => {
    const match = text.match(/`([a-zA-Z0-9_./]+)`/);
    return match ? match[1] : null;
};

const buildFileTree = (messages: Message[]) => {
    const planMessage = [...messages].reverse().find(m => m.plan);
    if (!planMessage || !planMessage.plan) return null;

    const root: any = { type: 'folder', name: 'game', children: {} };
    const services = ['Workspace', 'ReplicatedStorage', 'ServerScriptService', 'ServerStorage', 'StarterPlayer', 'StarterGui', 'StarterPack'];
    services.forEach(service => {
        root.children[service] = { type: 'folder', name: service, children: {} };
    });

    planMessage.plan.tasks.forEach(task => {
        const path = extractPath(task.text);
        if (!path) return;

        // Handle dot notation for services like StarterPlayer.StarterPlayerScripts
        const parts = path.replace(/\./g, '/').split('/');
        
        let parentService = parts[0];
        
        // Ensure the parent service exists in our tree root, even if it's not a standard one
        if (!root.children[parentService]) {
             root.children[parentService] = { type: 'folder', name: parentService, children: {} };
        }
        
        let currentLevel = root.children;

        for (let index = 0; index < parts.length; index++) {
            const part = parts[index];
            const isLastPart = index === parts.length - 1;

            if (isLastPart) {
                // It's a file
                let fileName = part;
                if (task.text.toLowerCase().includes('script') && !/\.[^/.]+$/.test(fileName)) {
                    fileName += '.lua';
                }
                currentLevel[fileName] = { type: 'file', name: fileName, status: task.status };
            } else {
                // It's a folder
                if (!currentLevel[part]) {
                    currentLevel[part] = { type: 'folder', name: part, children: {} };
                } else if (currentLevel[part].type !== 'folder' || !currentLevel[part].children) {
                    // A file exists where a directory should be, or it's a malformed folder. This path is invalid.
                    console.warn(`Path conflict for task "${task.text}". Path segment "${part}" is not a valid folder.`);
                    return; // Abort processing THIS task, continue to the next in the outer forEach.
                }
                currentLevel = currentLevel[part].children;
            }
        }
    });

    return root;
}


const FileTreeNode: React.FC<{ node: any, level: number }> = ({ node, level }) => {
    const [isOpen, setIsOpen] = useState(level < 2);
    const isFile = node.type === 'file';
    const itemStyle = { paddingLeft: `${level * 16}px` };

    if (isFile) {
        return (
            <div style={itemStyle} className={`flex items-center space-x-2 py-1.5 px-3 text-sm transition-colors rounded-md ${node.status === 'in-progress' ? 'text-white bg-white/5' : 'text-gray-400'}`}>
                {getFileIcon(node.status)}
                <span className="truncate">{node.name}</span>
            </div>
        )
    }

    // It's a folder
    const childrenArray = Object.values(node.children).sort((a: any, b: any) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name)
    });

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={itemStyle} 
                className="w-full flex items-center space-x-2 py-1.5 px-3 text-sm text-gray-300 font-medium hover:bg-white/5 rounded-md transition-colors"
            >
                <ChevronRightIcon className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}/>
                <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                <span className="truncate">{node.name}</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-0.5 mt-0.5">
                            {childrenArray.map((child: any, index: number) => (
                                <FileTreeNode key={index} node={child} level={level + 1} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

interface LeftSidebarProps {
    project: Project | null;
    messages: Message[];
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ project, messages }) => {
  const fileTree = project ? buildFileTree(messages) : null;
  const topLevelServices = fileTree ? Object.values(fileTree.children).filter((node: any) => Object.keys(node.children).length > 0) : [];

  return (
    <aside className="hidden md:flex flex-col w-64 p-4 bg-bg-secondary/30 border-r border-white/10">
        <div className="flex-shrink-0 p-3 mb-4">
             <h2 className="text-lg font-semibold text-white truncate">{project?.name || 'No Project Selected'}</h2>
             <p className="text-sm text-gray-500">File Explorer</p>
        </div>
      
      <nav className="flex-1 flex flex-col space-y-0.5 overflow-y-auto">
        {project ? (
            topLevelServices.length > 0 ? (
                topLevelServices.map((node: any, index: number) => <FileTreeNode key={index} node={node} level={0} />)
            ) : (
                <div className="px-3 text-sm text-gray-500">No execution plan generated yet.</div>
            )
        ) : (
             <div className="px-3 text-sm text-gray-500">Select a project to see its files.</div>
        )}
      </nav>
    </aside>
  );
};
