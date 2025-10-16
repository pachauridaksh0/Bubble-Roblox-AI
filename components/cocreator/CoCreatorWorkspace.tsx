import React from 'react';
import { Project, Message } from '../../types';
import { IdeWorkspace } from './IdeWorkspace';

interface CoCreatorWorkspaceProps {
    project: Project;
    messages: Message[];
}

const PlaceholderPlayground: React.FC<{ type: string }> = ({ type }) => (
    <div className="flex items-center justify-center h-full bg-bg-primary text-white">
        <div className="text-center">
            <h2 className="text-2xl font-bold">This is the {type} Playground</h2>
            <p className="text-gray-400">This specialized workspace is coming soon!</p>
        </div>
    </div>
);

export const CoCreatorWorkspace: React.FC<CoCreatorWorkspaceProps> = ({ project, messages }) => {

    switch (project.project_type) {
        case 'website':
            return <IdeWorkspace projectType="website" messages={messages} />;
        case 'roblox_game':
            return <IdeWorkspace projectType="roblox_game" messages={messages} />;
        case 'video':
            return <PlaceholderPlayground type="Video" />;
        case 'story':
            return <PlaceholderPlayground type="Story/Novel" />;
        case 'design':
            return <PlaceholderPlayground type="Design/Image" />;
        case 'presentation':
            return <PlaceholderPlayground type="Presentation" />;
        case 'document':
            return <PlaceholderPlayground type="Document" />;
        default:
             return <div className="flex items-center justify-center h-full">Select a project type to begin.</div>;
    }
};
