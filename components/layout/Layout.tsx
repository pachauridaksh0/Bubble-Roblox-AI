
import React, { useState, useEffect } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { ChatView } from '../chat/ChatView';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TopBar } from '../dashboard/TopBar';
import { Project, ProjectPlatform, Message } from '../../types';
import { NewProjectModal } from '../dashboard/NewProjectModal';
import { SettingsModal } from '../modals/SettingsModal';
import { useAuth } from '../../contexts/AuthContext';
import { getProjects, createProject } from '../../services/databaseService';

interface LayoutProps {
  geminiApiKey: string;
}

export const Layout: React.FC<LayoutProps> = ({ geminiApiKey }) => {
  const { user, supabase, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isNewProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  // This state is now just for passing to LeftSidebar, ChatView manages its own messages
  const [messages, setMessages] = useState<Message[]>([]);


  useEffect(() => {
    const fetchProjects = async () => {
      if (user && supabase) {
        setIsLoadingProjects(true);
        try {
          const userProjects = await getProjects(supabase, user.id);
          setProjects(userProjects);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setIsLoadingProjects(false);
        }
      }
    };
    fetchProjects();
  }, [user, supabase]);

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
  };

  const handleGoToDashboard = () => {
    setActiveProject(null);
  };

  const handleCreateProject = async (name: string, platform: ProjectPlatform) => {
    if (!user || !supabase) return;
    try {
        const newProject = await createProject(supabase, user.id, name, platform);
        setProjects(prev => [newProject, ...prev]);
        setActiveProject(newProject);
        setNewProjectModalOpen(false);
    } catch (error) {
        console.error("Failed to create project", error);
        alert("There was an error creating your project. Please try again.");
    }
  };
  
  return (
    <div className="flex h-screen w-full bg-bg-primary">
      <LeftSidebar 
        project={activeProject}
        messages={messages}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
            onGoToDashboard={handleGoToDashboard}
            onSettingsClick={() => setSettingsModalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {activeProject ? (
            <ChatView 
              key={activeProject.id} // Ensures component re-mounts for different projects
              project={activeProject} 
              geminiApiKey={geminiApiKey}
              // Pass a callback for ChatView to update the sidebar
              onMessagesUpdate={setMessages}
            />
          ) : (
            <ProjectsPage 
              projects={projects}
              onSelectProject={handleSelectProject}
              onNewProjectClick={() => setNewProjectModalOpen(true)}
              isLoading={isLoadingProjects}
            />
          )}
        </main>
      </div>
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onLogout={signOut}
        geminiApiKey={geminiApiKey}
      />
    </div>
  );
};