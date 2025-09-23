import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput } from '../types';
import { standingInstruction, opposingInstruction, synthesisInstruction } from './instructions';
import { thinkerSchema } from './schemas';
import { ThinkerResponse } from '../../types';

export const runThinkerAgent = async (input: AgentInput): Promise<AgentOutput> => {
    const { prompt, apiKey, model, project, chat } = input;
    const ai = new GoogleGenAI({ apiKey });

    // 1. Standing Response
    const standingResponseObj = await ai.models.generateContent({
        model,
        contents: `User request: "${prompt}"`,
        config: {
            systemInstruction: standingInstruction,
            responseMimeType: "application/json",
            responseSchema: thinkerSchema,
        }
    });
    const standing = JSON.parse(standingResponseObj.text.trim()) as ThinkerResponse;

    // 2. Opposing Response
    const opposingResponseObj = await ai.models.generateContent({
        model,
        contents: `The user's request is: "${prompt}". The initial plan is: "${standing.response}". Now, provide your critique.`,
        config: {
            systemInstruction: opposingInstruction,
            responseMimeType: "application/json",
            responseSchema: thinkerSchema,
        }
    });
    const opposing = JSON.parse(opposingResponseObj.text.trim()) as ThinkerResponse;

    // 3. Synthesis Response
    const synthesisResponseObj = await ai.models.generateContent({
        model,
        contents: `User request: "${prompt}"\n\nInitial Plan:\n${standing.response}\n\nCritique/Alternatives:\n${opposing.response}\n\nNow, generate the final synthesized response for the user.`,
        config: {
            systemInstruction: synthesisInstruction,
        }
    });
    const final = synthesisResponseObj.text;

    const aiMessage: AgentOutput[0] = {
        project_id: project.id,
        chat_id: chat.id,
        sender: 'ai',
        text: final, // The synthesized response is the main text
        standing_response: standing,
        opposing_response: opposing,
    };
    
    return [aiMessage];
};
