import { SupabaseClient, User } from '@supabase/supabase-js';
import { Project, Chat, Message } from '../types';

export interface AgentInput {
    prompt: string;
    apiKey: string;
    model: string;
    project: Project;
    chat: Chat;
    user: User;
    supabase: SupabaseClient;
    // Optional, for when a plan is being generated from answers
    answers?: string[]; 
}

// The output is just the message content. The ChatView will handle saving it to the DB.
export type AgentOutput = Omit<Message, 'id' | 'created_at'>[];
