import { erc20, USDC } from "@goat-sdk/plugin-erc20";

export const tokens = [
  USDC,
  {
    decimals: 18,
    symbol: "ETH",
    name: "Ethereum",
    chains: {
      // Representación de ETH en distintas redes (en 0x swaps se usa una pseudo-dirección para ETH)
      "1": {
        contractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as `0x${string}`,
      },
      "42161": {
        contractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as `0x${string}`,
      },
    },
  },
  {
    decimals: 18,
    symbol: "WETH",
    name: "Wrapped Ethereum",
    chains: {
      "1": {
        contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`,
      },
      "42161": {
        contractAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
      },
    },
  },
  {
    decimals: 18,
    symbol: "WSTETH",
    name: "Wrapped liquid staked Ether 2.0",
    chains: {
      // Arbitrum Mainnet
      "42161": {
        contractAddress: "0x5979d7b546e38e414f7e9822514be443a4800529" as `0x${string}`,
      },
      // Ethereum Mainnet (si fuera necesario)
      "1": {
        contractAddress: "0xSomeEthAddressForWstETH" as `0x${string}`,
      },
    },
  },
  {
    decimals: 18,
    symbol: "WEETH",
    name: "Wrapped eETH",
    chains: {
      "421611": {
        contractAddress: "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe" as `0x${string}`,
      },
    },
  },
  {
    decimals: 18,
    symbol: "ezETH",
    name: "Renzo Restaked ETH",
    chains: {
      "42161": {
        contractAddress: "0x2416092f143378750bb29b79eD961ab195CcEea5" as `0x${string}`,
      },
    },
  },
  {
    decimals: 18,
    symbol: "rETH",
    name: "Rocket Pool ETH",
    chains: {
      "42161": {
        contractAddress: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8" as `0x${string}`,
      },
    },
  },
];

const plugin = erc20({
  tokens,
});