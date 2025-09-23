import { Type } from "@google/genai";

export const codeGenerationSchema = (platform: 'Web App' | 'Roblox Studio') => ({
    type: Type.OBJECT,
    properties: {
        code: {
            type: Type.STRING,
            description: `The generated code (${platform === 'Web App' ? 'self-contained HTML' : 'Luau'}) to complete the task.`,
        },
        explanation: {
             type: Type.STRING,
             description: "A friendly explanation of the code.",
        }
    },
    required: ["explanation", "code"]
});
