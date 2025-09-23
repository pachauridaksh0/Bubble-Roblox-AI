import React, { useState, useEffect } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { ChatView } from '../chat/ChatView';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TopBar } from '../dashboard/TopBar';
import { Project, ProjectPlatform, Message, Chat } from '../../types';
import { NewProjectModal } from '../dashboard/NewProjectModal';
import { ProjectSettingsModal } from '../dashboard/ProjectSettingsModal';
import { SettingsPage } from '../pages/SettingsPage';
import { useAuth } from '../../contexts/AuthContext';
import { getProjects, createProject, getMessages, getChatsForProject, createChat as createDbChat, updateChat as updateDbChat, updateProject as updateDbProject } from '../../services/databaseService';
import { ImpersonationBanner } from '../admin/ImpersonationBanner';
import { WebAppPreview } from '../preview/WebAppPreview';

type View = 'dashboard' | 'project' | 'settings';

interface LayoutProps {
  geminiApiKey: string;
}

export const Layout: React.FC<LayoutProps> = ({ geminiApiKey }) => {
  const { user, supabase, signOut, isImpersonating, profile, isAdmin } = useAuth();
  
  const [view, setView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isNewProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [isProjectSettingsModalOpen, setProjectSettingsModalOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultIndices, setSearchResultIndices] = useState<number[]>([]);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(0);

  const activePlan = [...messages].reverse().find(m => m.plan)?.plan || null;
  
  // Effect to fetch initial projects and subscribe to real-time updates
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchAndSetProjects = async () => {
      setIsLoadingProjects(true);
      setProjectsError(null);
      try {
        const userProjects = await getProjects(supabase, user.id);
        setProjects(userProjects);
      } catch (error) {
        console.error("Failed to fetch projects", error);
        setProjectsError("Could not load your projects. Please check your network connection.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchAndSetProjects();

    const channel = supabase
      .channel(`user-projects-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
        () => fetchAndSetProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);
  
  useEffect(() => {
    const fetchMessages = async () => {
      if (activeChat && supabase) {
        setIsLoadingMessages(true);
        try {
          const history = await getMessages(supabase, activeChat.id);
          setMessages(history);
        } catch (error) {
          console.error("Failed to fetch message history:", error);
          setMessages([]);
        } finally {
          setIsLoadingMessages(false);
        }
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [activeChat, supabase]);
  
  useEffect(() => {
    const fetchChats = async () => {
      if (activeProject && supabase) {
        try {
          const projectChats = await getChatsForProject(supabase, activeProject.id);
          setChats(projectChats);
          if (projectChats.length > 0 && !activeChat) {
            setActiveChat(projectChats[0]);
          }
        } catch (error) {
          console.error("Failed to fetch chats:", error instanceof Error ? error.message : String(error));
          setChats([]);
        }
      } else {
        setChats([]);
      }
    };
    fetchChats();
  }, [activeProject, supabase]);


  useEffect(() => {
    setSearchQuery('');
    setSearchResultIndices([]);
    setCurrentSearchResultIndex(0);
  }, [activeChat]);

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    setActiveChat(null); // Reset active chat when project changes
    setView('project');
  };

  const handleGoToDashboard = () => {
    setActiveProject(null);
    setActiveChat(null);
    setView('dashboard');
  };
  
  const handleGoToSettings = () => {
    setView('settings');
  };

  const handleCreateProject = async (name: string, platform: ProjectPlatform) => {
    if (!user || !supabase) return;
    try {
        const { project: newProject, chat: newChat } = await createProject(supabase, user.id, name, platform);
        setProjects(prevProjects => [newProject, ...prevProjects]);
        setActiveProject(newProject);
        setChats([newChat]);
        setActiveChat(newChat);
        setView('project');
    } catch (error) {
        console.error("Failed to create project", error);
        throw error;
    }
  };

  const handleCreateChat = async () => {
    if (!activeProject || !user || !supabase) return;
    try {
      const newChat = await createDbChat(supabase, activeProject.id, user.id, "New Chat", 'chat');
      setChats(prev => [...prev, newChat]);
      setActiveChat(newChat);
    } catch (error) {
      console.error("Failed to create new chat:", error instanceof Error ? error.message : String(error));
    }
  };

  const handleUpdateChat = async (chatId: string, updates: Partial<Chat>) => {
    if (!supabase) return;
    try {
      const updatedChat = await updateDbChat(supabase, chatId, updates);
      setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));
      if (activeChat?.id === chatId) {
        setActiveChat(updatedChat);
      }
    } catch (error) {
      console.error("Failed to update chat:", error);
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!supabase) return;
    try {
        const updatedProject = await updateDbProject(supabase, projectId, updates);
        setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        if (activeProject?.id === projectId) {
            setActiveProject(updatedProject);
        }
    } catch (error) {
        console.error("Failed to update project", error);
        throw error;
    }
  };
  
  const renderContent = () => {
      switch(view) {
          case 'project':
              if (activeProject && activeChat) {
                  return (
                    <ChatView 
                      key={activeChat.id}
                      project={activeProject} 
                      chat={activeChat}
                      geminiApiKey={geminiApiKey}
                      initialMessages={messages}
                      isLoadingHistory={isLoadingMessages}
                      onMessagesUpdate={setMessages}
                      onChatUpdate={handleUpdateChat}
                      searchQuery={searchQuery}
                      onSearchResultsChange={setSearchResultIndices}
                      currentSearchResultMessageIndex={searchResultIndices[currentSearchResultIndex] ?? -1}
                      isAdmin={isAdmin}
                    />
                  );
              }
               if (activeProject && chats.length === 0) {
                 // Handles the case where a project exists but has no chats yet
                 return <div className="flex items-center justify-center h-full text-gray-400">This project has no chats. Create one to get started.</div>
               }
              // Fallback to dashboard if project/chat isn't set
              return (
                 <div className="flex items-center justify-center h-full">
                    <svg className="animate-spin h-8 w-8 text-primary-start" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8
 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
              );
          case 'settings':
              return <SettingsPage onBack={() => setView('dashboard')} />;
          case 'dashboard':
          default:
              return (
                <ProjectsPage
                  profile={profile}
                  projects={projects}
                  onSelectProject={handleSelectProject}
                  onNewProjectClick={() => setNewProjectModalOpen(true)}
                  isLoading={isLoadingProjects}
                  error={projectsError}
                />
              );
      }
  }

  const handleNextSearchResult = () => {
    if (searchResultIndices.length > 0) {
      setCurrentSearchResultIndex(prev => (prev + 1) % searchResultIndices.length);
    }
  };

  const handlePrevSearchResult = () => {
    if (searchResultIndices.length > 0) {
      setCurrentSearchResultIndex(prev => (prev - 1 + searchResultIndices.length) % searchResultIndices.length);
    }
  };
  
  return (
    <div className="flex h-screen w-full bg-bg-primary">
      <LeftSidebar
        project={activeProject}
        chats={chats}
        activeChatId={activeChat?.id}
        onSelectChat={setActiveChat}
        onCreateChat={handleCreateChat}
        onUpdateChat={handleUpdateChat}
        onSettingsClick={handleGoToSettings}
        isAdminView={false}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {isImpersonating && <ImpersonationBanner />}
        <TopBar 
            activeProjectName={activeProject?.name || null}
            onGoToDashboard={handleGoToDashboard}
            onAccountSettingsClick={handleGoToSettings}
            onProjectSettingsClick={() => setProjectSettingsModalOpen(true)}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchResultCount={searchResultIndices.length}
            currentSearchResultIndex={currentSearchResultIndex}
            onNextSearchResult={handleNextSearchResult}
            onPrevSearchResult={handlePrevSearchResult}
        />
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
          {view === 'project' && activeProject?.platform === 'Web App' && (
            <WebAppPreview messages={messages} />
          )}
        </main>
      </div>
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
      <ProjectSettingsModal
        isOpen={isProjectSettingsModalOpen}
        onClose={() => setProjectSettingsModalOpen(false)}
        project={activeProject}
        onSave={handleUpdateProject}
      />
    </div>
  );
};