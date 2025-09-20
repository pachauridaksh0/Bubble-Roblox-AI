import { SupabaseClient } from '@supabase/supabase-js';
import { Project, Message, Plan, ProjectPlatform } from '../types';

// === Projects ===

export const getProjects = async (supabase: SupabaseClient, userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
    return data || [];
};

export const createProject = async (supabase: SupabaseClient, userId: string, name: string, platform: ProjectPlatform): Promise<Project> => {
    const { data, error } = await supabase
        .from('projects')
        .insert({ 
            user_id: userId,
            name,
            platform,
            description: 'Newly created project.', // Default description
            status: 'In Progress' // Default status
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating project:', error);
        throw error;
    }
    return data;
}

// === Messages ===

export const getMessages = async (supabase: SupabaseClient, projectId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
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
        console.error('Error adding message:', error);
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
        console.error('Error updating message plan:', error);
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
        console.error('Error updating message clarification:', error);
        throw error;
    }
    return data;
};
