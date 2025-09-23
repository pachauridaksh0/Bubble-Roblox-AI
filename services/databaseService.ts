import { SupabaseClient } from '@supabase/supabase-js';
import { Project, Message, Plan, ProjectPlatform, Profile, Chat, ChatMode } from '../types';

// === Projects ===

export const getProjects = async (supabase: SupabaseClient, userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error.message);
        throw error;
    }
    return data || [];
};

export const getAllProjects = async (supabase: SupabaseClient): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all projects for admin:', error.message);
        throw error;
    }
    return data || [];
};

export const createProject = async (supabase: SupabaseClient, userId: string, name: string, platform: ProjectPlatform): Promise<{project: Project, chat: Chat}> => {
    // First, create the project
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({ 
            user_id: userId,
            name,
            platform,
            description: 'Newly created project.', // Default description
            status: 'In Progress', // Default status
            default_model: 'gemini-2.5-flash',
        })
        .select()
        .single();
    
    if (projectError) {
        console.error('Error creating project:', projectError.message);
        throw projectError;
    }
    
    // Then, create the initial chat for this project
    const newChat = await createChat(supabase, projectData.id, userId, "General Chat", "chat");

    return { project: projectData, chat: newChat };
}

export const updateProject = async (supabase: SupabaseClient, projectId: string, updates: Partial<Project>): Promise<Project> => {
    const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select()
        .single();

    if (error) {
        console.error('Error updating project:', error.message);
        throw error;
    }
    return data;
};


// === Chats ===

export const getChatsForProject = async (supabase: SupabaseClient, projectId: string): Promise<Chat[]> => {
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching chats:', error.message);
        throw error;
    }
    return data || [];
};

export const createChat = async (supabase: SupabaseClient, projectId: string, userId: string, name: string, mode: ChatMode): Promise<Chat> => {
    const { data, error } = await supabase
        .from('chats')
        .insert({
            project_id: projectId,
            user_id: userId,
            name: name,
            mode: mode,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating chat:', error.message);
        throw error;
    }
    return data;
};

export const updateChat = async (supabase: SupabaseClient, chatId: string, updates: Partial<Chat>): Promise<Chat> => {
    const { data, error } = await supabase
        .from('chats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating chat:', error.message);
        throw error;
    }
    return data;
};


// === Profiles ===

export const createProfile = async (supabase: SupabaseClient, userId: string, displayName: string, avatarUrl: string): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            roblox_username: displayName, // Re-purposing this field for display name
            avatar_url: avatarUrl,
            roblox_id: userId, // Fallback value
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating profile:', error.message);
        throw error;
    }
    return data;
};

export const updateProfile = async (supabase: SupabaseClient, userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error.message);
        throw error;
    }
    return data;
};


export const getAllProfiles = async (supabase: SupabaseClient): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('roblox_username', { ascending: true });
        
    if (error) {
        console.error('Error fetching all profiles for admin:', error.message);
        throw error;
    }
    
    return data || [];
};

export const updateProfileForAdmin = async (supabase: SupabaseClient, userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile for admin:', error.message);
        throw error;
    }
    return data;
};


// === Messages ===

export const getMessages = async (supabase: SupabaseClient, chatId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error.message);
        throw error;
    }
    return data || [];
};

export const addMessage = async (supabase: SupabaseClient, message: Omit<Message, 'id' | 'created_at'>): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();
    
    if (error) {
        console.error('Error adding message:', error.message);
        throw error;
    }
    return data;
};

export const updateMessagePlan = async (supabase: SupabaseClient, messageId: string, plan: Plan): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .update({ plan })
        .eq('id', messageId)
        .select()
        .single();

    if (error) {
        console.error('Error updating message plan:', error.message);
        throw error;
    }
    return data;
};

export const updateMessageClarification = async (supabase: SupabaseClient, messageId: string, clarification: any): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .update({ clarification })
        .eq('id', messageId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating message clarification:', error.message);
        throw error;
    }
    return data;
};