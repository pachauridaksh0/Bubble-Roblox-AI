import { AgentInput, AgentOutput, AgentExecutionResult } from './types';
import { runChatAgent } from './chat/handler';
import { runPlanAgent } from './plan/handler';
import { runBuildAgent } from './build/handler';
import { runThinkerAgent } from './thinker/handler';
import { runSuperAgent } from './super_agent/handler';
import { runProMaxAgent } from './pro_max/handler';

export const runAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    try {
        switch (input.chat.mode) {
            case 'chat':
                return await runChatAgent(input);
            case 'plan':
                return await runPlanAgent(input);
            case 'build':
                return await runBuildAgent(input);
            case 'thinker':
                return await runThinkerAgent(input);
            case 'super_agent':
                return await runSuperAgent(input);
            case 'pro_max':
                return await runProMaxAgent(input);
            default:
                // Fallback to the build agent for any undefined modes that should create plans.
                return await runBuildAgent(input);
        }
    } catch(error) {
        console.error(`Error running agent for mode "${input.chat.mode}":`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const fallbackMessage: AgentOutput[0] = {
            project_id: input.project.id,
            chat_id: input.chat.id,
            text: `I'm sorry, but I encountered an error while processing your request. Please try again. (Error: ${errorMessage})`,
            sender: 'ai',
        };
        return { messages: [fallbackMessage] };
    }
};
