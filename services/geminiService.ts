import { GoogleGenAI } from "@google/genai";

// Helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) {
        return false;
    }
    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "hello",
            config: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
};

export const generateChatTitle = async (prompt: string, apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following user prompt, generate a short, descriptive chat title (3-5 words max). Do not use quotes or special characters.

User prompt: "${prompt}"`,
        config: {
            systemInstruction: 'You are an AI that creates concise titles for conversations.',
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    // Clean up response: remove quotes, trim whitespace
    return response.text.replace(/"/g, '').trim();
}
