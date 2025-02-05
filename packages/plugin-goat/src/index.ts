import type { Plugin, Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import { getOnChainActions as getSwap0xAction } from "./actions/swapTokens";
import { getWalletInfoActions } from "./actions/getWalletInfo";
import { getOnChainActions as getSendFundsActions } from "./actions/sendFunds";
import { getWalletClients, getWalletProviders } from "./providers/wallet";

// Helper para normalizar acciones, asignando valores por defecto a propiedades faltantes
function normalizeAction(action: Partial<Action>): Action {
  return {
    name: action.name || "unnamed",
    description: action.description || "",
    handler: action.handler!,
    similes: action.similes || [],
    examples: action.examples || [],
    validate: action.validate || (() => Promise.resolve(true)),
  };
}

async function createGoatPlugin(
  getSetting: (key: string) => string | undefined
): Promise<Plugin> {
  // Se obtienen todos los walletClients configurados
  const walletClients = getWalletClients(getSetting);

  // Se obtienen las acciones para enviar fondos y se normalizan
  const sendFundsActions = await getSendFundsActions(walletClients["mainnet"] || Object.values(walletClients)[0]);
  const normalizedSendFundsActions = sendFundsActions.map(normalizeAction);
  
  // Se obtienen las acciones y se normalizan, ahora pasamos el mapping completo a swapTokens
  const swapTokensActions = await getSwap0xAction(walletClients["mainnet"] || Object.values(walletClients)[0]);
  const normalizedSwapActions = swapTokensActions.map(normalizeAction);

  const walletInfoActions = await getWalletInfoActions(walletClients["mainnet"] || Object.values(walletClients)[0]);
  const normalizedWalletInfoActions = walletInfoActions.map(normalizeAction);

  // Se recolectan todos los providers
  const walletProviders = getWalletProviders(walletClients).map((item) => item.provider);

  return {
    name: "[GOAT] Onchain Actions",
    description:
      "Index.",
    providers: walletProviders,
    evaluators: [],
    services: [],
    actions: [...normalizedSwapActions, ...normalizedSendFundsActions, ...normalizedWalletInfoActions],
  };
}

export default createGoatPlugin;