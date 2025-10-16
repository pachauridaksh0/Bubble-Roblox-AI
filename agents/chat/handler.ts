import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { chatInstruction } from './instructions';
import { Message } from '../../types';
import { getUserFriendlyError } from "../errorUtils";
import { getMemoriesForContext } from "../../services/databaseService";

const mapMessagesToGeminiHistory = (messages: Message[]) => {
  return messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
    parts: [{ text: msg.text }],
  })).filter(msg => msg.parts[0].text.trim() !== '');
};

// This agent is now ONLY for Co-Creator's "Chat" mode.
export const runChatAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    const { prompt, apiKey, model, project, chat, onStreamChunk, history, supabase, user } = input;
    try {
        // Step 1: Handle redirection logic specific to Co-Creator mode.
        const lowercasedPrompt = prompt.toLowerCase();
        const thinkerKeywords = ['think', 'reason', 'debate', 'what if', 'pros and cons'];
        const buildKeywords = ['make', 'create', 'build', 'generate', 'script', 'plan for'];

        if (thinkerKeywords.some(keyword => lowercasedPrompt.includes(keyword))) {
            const hardcodedResponse = "That's a great question! For debating ideas, please switch to **Bubble Thinker** mode using the selector below the input bar.";
            onStreamChunk?.(hardcodedResponse);
            const aiMessage: AgentOutput[0] = { project_id: project.id, chat_id: chat.id, sender: 'ai', text: hardcodedResponse };
            return { messages: [aiMessage] };
        }
        
        if (buildKeywords.some(keyword => lowercasedPrompt.includes(keyword))) {
            const hardcodedResponse = "It looks like you want to build something! To create a plan or generate code, please switch to **Bubble Build** mode using the selector below the input bar.";
            onStreamChunk?.(hardcodedResponse);
            const aiMessage: AgentOutput[0] = { project_id: project.id, chat_id: chat.id, sender: 'ai', text: hardcodedResponse };
            return { messages: [aiMessage] };
        }
        
        // Step 2: If no redirection, generate a conversational response.
        const ai = new GoogleGenAI({ apiKey });
        
        const geminiHistory = mapMessagesToGeminiHistory(history);
        const contents = [...geminiHistory, { role: 'user', parts: [{ text: prompt }] }];
        
        const memoryContext = await getMemoriesForContext(supabase, user.id, project.id);
        const systemInstruction = `${chatInstruction}\n\nMEMORY CONTEXT:\n${memoryContext}`;

        const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                topP: 0.9,
                candidateCount: 1,
                maxOutputTokens: 2048,
            },
        });

        let fullText = '';
        // Stream the response, calling the callback with each new chunk
        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                onStreamChunk?.(chunkText);
            }
        }

        // Return the final, complete message for database saving
        const aiMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: fullText,
        };

        return { messages: [aiMessage] };
    } catch (error) {
        console.error("Error in runChatAgent:", error);
        const errorMessage = getUserFriendlyError(error);
        const fallbackMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: errorMessage
        };
        return { messages: [fallbackMessage] };
    }
};