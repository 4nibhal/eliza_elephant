import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { sendETH } from "@goat-sdk/wallet-evm";
import type { WalletClientBase } from "@goat-sdk/core";

import {
    generateText,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
} from "@elizaos/core";

export async function getOnChainActions(wallet: WalletClientBase) {
    const actionsWithoutHandler = [
        {
            name: "SEND_FUNDS",
            description: "Send ETH from the controlled wallet to another address",
            similes: [],
            validate: async () => true,
            examples: [],
        },
    ];

    const tools = await getOnChainTools({
        wallet: wallet,
        plugins: [sendETH()],
    });

    return actionsWithoutHandler.map((action) => ({
        ...action,
        handler: getActionHandler(action.name, action.description, tools),
    }));
}

function getActionHandler(
    actionName: string,
    actionDescription: string,
    tools: any
) {
    return async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        let currentState = state ?? (await runtime.composeState(message));
        currentState = await runtime.updateRecentMessageState(currentState);

        try {
            // Compose the action context. Include instructions to prompt for recipient and amount.
            const context = composeActionContext(actionName, actionDescription, currentState);
            const result = await generateText({
                runtime,
                context,
                tools,
                maxSteps: 10,
                modelClass: ModelClass.LARGE,
            });

            // Compose the response message to notify about the fund transfer.
            const response = composeResponseContext(result, currentState);
            const responseText = await generateResponse(runtime, response);

            callback?.({
                text: responseText,
                content: {},
            });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            const errorResponse = composeErrorResponseContext(errorMessage, currentState);
            const errorResponseText = await generateResponse(runtime, errorResponse);

            callback?.({
                text: errorResponseText,
                content: { error: errorMessage },
            });
            return false;
        }
    };
}

function composeActionContext(
    actionName: string,
    actionDescription: string,
    state: State
): string {
    const actionTemplate = `
# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Action: ${actionName}
${actionDescription}

{{recentMessages}}

Please provide the recipient ETH address and the amount to send.
`;
    return composeContext({ state, template: actionTemplate });
}

function composeResponseContext(result: unknown, state: State): string {
    const responseTemplate = `
# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

The funds transfer result is:
${JSON.stringify(result)}

{{actions}}

Notify the user that the ETH has been sent successfully. 
Include details from the previous messages:
{{recentMessages}}
  `;
    return composeContext({ state, template: responseTemplate });
}

function composeErrorResponseContext(
    errorMessage: string,
    state: State
): string {
    const errorResponseTemplate = `
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

An error occurred during the funds transfer:
${errorMessage}

{{actions}}

These were the previous messages:
{{recentMessages}}
    `;
    return composeContext({ state, template: errorResponseTemplate });
}

async function generateResponse(
    runtime: IAgentRuntime,
    context: string
): Promise<string> {
    return generateText({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    });
}