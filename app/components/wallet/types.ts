export type Transaction = {
  id: number;
  type: "CREDIT" | "DEBIT";
  amount: string;
  description: string;
  createdAt: string;
};

export type WalletActivityItem = {
  id: number | string;
  type: "CREDIT" | "DEBIT";
  amount: string;
  description: string;
  createdAt: string;
};

export type TokenHolding = {
  name: string;
  symbol: string;
  icon: any;
  amount: string;
  value: number;
  change: number;
};
