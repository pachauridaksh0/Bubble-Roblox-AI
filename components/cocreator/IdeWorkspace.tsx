import React, { useState } from 'react';
import SplitGrid from 'react-split-grid';
import Editor from '@monaco-editor/react';
import { FileExplorer } from './FileExplorer';
import { WebAppPreview } from '../preview/WebAppPreview';
import { Message } from '../../types';

interface IdeWorkspaceProps {
    projectType: 'website' | 'roblox_game'; // Example types
    messages: Message[];
}

export const IdeWorkspace: React.FC<IdeWorkspaceProps> = ({ projectType, messages }) => {
    const [code, setCode] = useState(
`-- Welcome to your Bubble Workspace!
-- Your generated code will appear here.
print("Hello, Bubble!")`
    );

    const handleEditorChange = (value: string | undefined) => {
        setCode(value || '');
    };

    return (
        <div className="h-full w-full bg-bg-primary text-white">
            <SplitGrid
                minSize={200}
                cursor="col-resize"
                render={({ getGridProps, getGutterProps }) => (
                    <div className="grid grid-cols-[250px_1fr_1fr] h-full" {...getGridProps()}>
                        <FileExplorer />

                        <div className="h-full bg-gray-800" {...getGutterProps('column', 1)} />

                        <div className="flex flex-col h-full">
                            <Editor
                                height="100%"
                                language={projectType === 'roblox_game' ? 'lua' : 'html'}
                                theme="vs-dark"
                                value={code}
                                onChange={handleEditorChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    wordWrap: 'on',
                                }}
                            />
                        </div>
                        
                        <div className="h-full bg-gray-800" {...getGutterProps('column', 3)} />

                        <div className="h-full">
                            {projectType === 'website' ? (
                                <WebAppPreview messages={messages} />
                            ) : (
                                <div className="p-4 h-full flex items-center justify-center bg-bg-secondary">
                                    <p className="text-gray-400 text-center">Live preview for Roblox Games coming soon.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            />
        </div>
    );
};
