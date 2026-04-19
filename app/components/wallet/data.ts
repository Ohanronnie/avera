import type { TokenHolding, WalletActivityItem } from "@/components/wallet/types";

export const CHART_HEIGHT = 150;

export const CHART_POINTS = [
  78, 72, 96, 70, 76, 82, 103, 88, 108, 114, 68, 112, 130, 124, 78, 72, 96, 70,
  76, 82, 103, 88, 108, 114, 68, 112, 130, 124, 78, 72, 96, 70, 76, 82, 103, 88,
  108, 114, 68, 112, 130, 124,
];

export const tokenHoldings: TokenHolding[] = [
  {
    name: "Tether USD",
    symbol: "USDT",
    icon: require("@/assets/images/onboarding/usdt-icon.png"),
    amount: "2,940.15 USDT",
    value: 2940.15,
    change: 0.12,
  },
  {
    name: "Bitcoin",
    symbol: "BTC",
    icon: require("@/assets/images/onboarding/btc-icon.png"),
    amount: "0.0286 BTC",
    value: 1752.87,
    change: 4.36,
  },
  {
    name: "Solana",
    symbol: "SOL",
    icon: require("@/assets/images/onboarding/solana-icon.png"),
    amount: "5.781 SOL",
    value: 788.12,
    change: 8.28,
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    icon: require("@/assets/images/onboarding/eth-icon.png"),
    amount: "0.204 ETH",
    value: 409.03,
    change: -1.09,
  },
  {
    name: "Nigerian Naira",
    symbol: "NGN",
    icon: require("@/assets/images/onboarding/ngn.png"),
    amount: "₦1,280,000",
    value: 272.77,
    change: 1.41,
  },
];

export function getTokenHoldingBySymbol(symbol?: string) {
  if (!symbol) return undefined;

  return tokenHoldings.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

export const fallbackActivity: WalletActivityItem[] = [
  {
    id: "sample-1",
    type: "CREDIT",
    amount: "250000",
    description: "USDT deposit received",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    type: "DEBIT",
    amount: "120000",
    description: "BTC purchase completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "sample-3",
    type: "CREDIT",
    amount: "84000",
    description: "NGN wallet funded",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];
