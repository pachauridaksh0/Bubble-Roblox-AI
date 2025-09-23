import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput } from '../types';
import { chatInstruction } from './instructions';

export const runChatAgent = async (input: AgentInput): Promise<AgentOutput> => {
    const { prompt, apiKey, model, project, chat } = input;
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            systemInstruction: chatInstruction,
            temperature: 0.7,
        },
    });

    const aiMessage: AgentOutput[0] = {
        project_id: project.id,
        chat_id: chat.id,
        sender: 'ai',
        text: response.text,
    };

    return [aiMessage];
};
