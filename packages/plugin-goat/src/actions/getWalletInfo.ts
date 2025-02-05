import type { IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { getWalletClients } from "../providers/wallet";
import { formatUnits } from "viem";
import {
  generateText,
  ModelClass,
  composeContext,
} from "@elizaos/core";

const getFormattedBalance = (raw: unknown, decimals: number): string => {
  const rawStr = raw?.toString() || "0";
  let value: bigint;
  if (rawStr.includes(".")) {
    // Convertir string flotante a bigint aplicando el multiplicador de decimales
    value = BigInt(Math.floor(parseFloat(rawStr) * 10 ** decimals));
  } else {
    value = BigInt(rawStr);
  }
  return formatUnits(value, decimals);
};

export async function getWalletInfoActions(wallet: unknown) {
  const actionsWithoutHandler = [
    {
      name: "GET_WALLET_INFO",
      description: "Retrieves information of the agent's wallet (address and balances)",
      similes: [],
      validate: async () => true,
      examples: [],
    },
  ];

  return actionsWithoutHandler.map((action) => ({
    ...action,
    handler: getWalletInfoHandler,
  }));
}

async function getWalletInfoHandler(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined,
  _options?: Record<string, unknown>,
  callback?: HandlerCallback
): Promise<boolean> {
  let currentState = state ?? (await runtime.composeState(message));
  currentState = await runtime.updateRecentMessageState(currentState);

  try {
    const getSetting = runtime.getSetting.bind(runtime);
    const walletClients = getWalletClients(getSetting);
    if (Object.keys(walletClients).length === 0) {
      throw new Error("No wallet clients configured");
    }

    let info = "";
    for (const [chain, client] of Object.entries(walletClients)) {
      const address = client.getAddress();
      let balanceInfo = "";
      try {
        const nativeRaw = await client.balanceOf(address);
        const rawValue =
          typeof nativeRaw === "object" && nativeRaw !== null && "value" in nativeRaw
            ? nativeRaw.value
            : nativeRaw;
        const nativeDecimals = typeof (client as any).getNativeDecimals === "function"
          ? await (client as any).getNativeDecimals()
          : 18;
        const nativeBalance = getFormattedBalance(rawValue, nativeDecimals);
        balanceInfo = `Balance (NATIVE): ${nativeBalance}`;
      } catch (nativeErr) {
        balanceInfo = "Error retrieving native balance";
        console.error(`Error en balance de ${chain}:`, nativeErr);
      }
      info += `Wallet Address: ${address} (Chain: ${chain})\n${balanceInfo}\n\n`;
    }

    const context = composeWalletInfoContext(info, currentState);
    const responseText = await generateResponse(runtime, context);
    callback?.({
      text: responseText,
      content: { walletInfo: info },
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const context = composeWalletInfoErrorContext(errorMessage, currentState);
    const responseText = await generateResponse(runtime, context);
    callback?.({
      text: responseText,
      content: { error: errorMessage },
    });
    return false;
  }
}

function composeWalletInfoContext(info: string, state: State): string {
  const template = `
# Wallet Information

${info}

# Additional Details
Agent: {{agentName}}
Knowledge: {{knowledge}}
Recent Messages:
{{recentMessages}}
`;
  return composeContext({ state, template });
}

function composeWalletInfoErrorContext(errorMessage: string, state: State): string {
  const template = `
# Wallet Information Error

An error occurred while retrieving wallet info:
${errorMessage}

# Additional Details
Agent: {{agentName}}
Knowledge: {{knowledge}}
Recent Messages:
{{recentMessages}}
`;
  return composeContext({ state, template });
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