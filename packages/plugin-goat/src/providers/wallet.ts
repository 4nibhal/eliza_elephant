import type { WalletClientBase } from "@goat-sdk/core";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
// Importamos cadenas conocidas, ampliadas para soportar arbitrum, base y la mainnet (mode)
import { mode, arbitrum, base } from "viem/chains";
import type { Chain } from "viem/chains";

// Utilidad para generar la configuración de una cadena según su nombre y provider
function genChainFromName(chainName: string, provider: string): Chain {
    switch (chainName.toLowerCase()) {
        case "arbitrum":
            return arbitrum;
        case "base":
            return base;
        // La mainnet se representa por defecto con 'mode'
        case "mainnet":
        default:
            return mode;
    }
}

// Obtiene todas las cadenas configuradas mediante settings.
// Si "EVM_CHAINS" se define (ej. "mainnet,arbitrum,base"), se usará cada nombre
// y se intentará leer el provider específico ("EVM_PROVIDER_MAINNET", etc).
function getChains(getSetting: (key: string) => string | undefined): Record<string, Chain> {
    const chains: Record<string, Chain> = {};
    const chainsStr = getSetting("EVM_CHAINS");
    if (chainsStr) {
        const chainNames = chainsStr.split(",").map((s) => s.trim()).filter(Boolean);
        for (const name of chainNames) {
            const providerKey = `EVM_PROVIDER_${name.toUpperCase()}`;
            const provider = getSetting(providerKey) || getSetting("EVM_PROVIDER_URL");
            if (!provider) {
                throw new Error(`Provider for chain ${name} not configured`);
            }
            chains[name] = genChainFromName(name, provider);
        }
    } else {
        // Si no se configura EVM_CHAINS, se usa EVM_CHAIN o la mainnet (mode) por defecto
        const chainName = getSetting("EVM_CHAIN") || mode.name;
        const provider = getSetting("EVM_PROVIDER_URL");
        if (!provider) throw new Error("EVM_PROVIDER_URL not configured");
        chains[chainName] = genChainFromName(chainName, provider);
    }
    return chains;
}

// Crea un wallet client por cada cadena configurada
export function getWalletClients(
    getSetting: (key: string) => string | undefined
): Record<string, WalletClientBase> {
    const privateKey = getSetting("EVM_PRIVATE_KEY");
    if (!privateKey) return {};
    
    const chains = getChains(getSetting);
    const walletClients: Record<string, WalletClientBase> = {};
    
    for (const [chainName, chain] of Object.entries(chains)) {
        const provider = getSetting(`EVM_PROVIDER_${chainName.toUpperCase()}`) || getSetting("EVM_PROVIDER_URL")!;
        const wallet = createWalletClient({
            account: privateKeyToAccount(privateKey as `0x${string}`),
            chain,
            transport: http(provider),
        });
        walletClients[chainName] = viem(wallet);
    }
    
    return walletClients;
}

// Define un wallet provider para cada wallet client,
// exponiendo el método get() que retorna información relevante del wallet.
export function getWalletProviders(walletClients: Record<string, WalletClientBase>) {
    return Object.entries(walletClients).map(([chainName, walletClient]) => ({
        chain: chainName,
        provider: {
            async get(): Promise<string | null> {
                try {
                    const address = walletClient.getAddress();
                    const balance = await walletClient.balanceOf(address);
                    return `EVM (${chainName}) Wallet Address: ${address}\nBalance: ${balance} ETH`;
                } catch (error) {
                    console.error(`Error in wallet provider for ${chainName}:`, error);
                    return null;
                }
            },
        },
    }));
}