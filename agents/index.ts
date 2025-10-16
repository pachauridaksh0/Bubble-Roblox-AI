import { AgentInput, AgentOutput, AgentExecutionResult } from './types';
import { runChatAgent } from './chat/handler';
import { runPlanAgent } from './plan/handler';
import { runBuildAgent } from './build/handler';
import { runThinkerAgent } from './thinker/handler';
import { runSuperAgent } from './super_agent/handler';
import { runProMaxAgent } from './pro_max/handler';
import { runAutonomousAgent } from './autonomous/handler';
import { getUserFriendlyError } from './errorUtils';
import { summarizeOldHistory } from './historyService';

export const runAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    try {
        // Summarize conversation history if it's too long
        const optimizedHistory = await summarizeOldHistory(input.history, input.apiKey);
        const agentInputWithOptimizedHistory = { ...input, history: optimizedHistory };

        // Route to the dedicated autonomous agent if in that mode.
        if (input.workspaceMode === 'autonomous') {
            return await runAutonomousAgent(agentInputWithOptimizedHistory);
        }

        // In Co-Creator mode, respect the user's selected chat agent.
        switch (input.chat.mode) {
            case 'chat':
                return await runChatAgent(agentInputWithOptimizedHistory);
            case 'plan':
                return await runPlanAgent(agentInputWithOptimizedHistory);
            case 'build':
                return await runBuildAgent(agentInputWithOptimizedHistory);
            case 'thinker':
                return await runThinkerAgent(agentInputWithOptimizedHistory);
            case 'super_agent':
                return await runSuperAgent(agentInputWithOptimizedHistory);
            case 'pro_max':
                return await runProMaxAgent(agentInputWithOptimizedHistory);
            default:
                // Fallback to the build agent for any undefined modes that should create plans.
                return await runBuildAgent(agentInputWithOptimizedHistory);
        }
    } catch(error) {
        console.error(`Error running agent for mode "${input.chat.mode}" in workspace "${input.workspaceMode}":`, error);
        const errorMessage = getUserFriendlyError(error);
        const fallbackMessage: AgentOutput[0] = {
            project_id: input.project.id,
            chat_id: input.chat.id,
            text: `I'm sorry, but I encountered an error while processing your request. ${errorMessage}`,
            sender: 'ai',
        };
        return { messages: [fallbackMessage] };
    }
};
