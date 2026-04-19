export type P2PListing = {
  id: string;
  seller: string;
  asset: string;
  rate: number;
  available: string;
  limit: string;
  minLimit: number;
  maxLimit: number;
  method: string;
  completion: number;
  trades: number;
  speed: number;
  verified: boolean;
};

export const p2pAssets = ["USDT", "BTC", "ETH", "SOL"];
export const p2pPaymentMethods = ["All", "Bank Transfer", "Wallet", "Instant"];

export const p2pListings: P2PListing[] = [
  {
    id: "p2p-1",
    seller: "Ronnie Desk",
    asset: "USDT",
    rate: 1518,
    available: "12,400 USDT",
    limit: "₦20,000 - ₦4,000,000",
    minLimit: 20000,
    maxLimit: 4000000,
    method: "Bank Transfer",
    completion: 98,
    trades: 421,
    speed: 2,
    verified: true,
  },
  {
    id: "p2p-2",
    seller: "Avera Prime",
    asset: "BTC",
    rate: 1542,
    available: "0.84 BTC",
    limit: "₦100,000 - ₦12,000,000",
    minLimit: 100000,
    maxLimit: 12000000,
    method: "Wallet",
    completion: 99,
    trades: 188,
    speed: 5,
    verified: true,
  },
  {
    id: "p2p-3",
    seller: "SwiftPay NG",
    asset: "USDT",
    rate: 1510,
    available: "5,900 USDT",
    limit: "₦10,000 - ₦2,500,000",
    minLimit: 10000,
    maxLimit: 2500000,
    method: "Instant",
    completion: 96,
    trades: 276,
    speed: 1,
    verified: false,
  },
  {
    id: "p2p-4",
    seller: "Sol Desk",
    asset: "SOL",
    rate: 1502,
    available: "830 SOL",
    limit: "₦30,000 - ₦1,800,000",
    minLimit: 30000,
    maxLimit: 1800000,
    method: "Bank Transfer",
    completion: 94,
    trades: 91,
    speed: 4,
    verified: true,
  },
  {
    id: "p2p-5",
    seller: "Ether Express",
    asset: "ETH",
    rate: 1534,
    available: "14.8 ETH",
    limit: "₦50,000 - ₦6,000,000",
    minLimit: 50000,
    maxLimit: 6000000,
    method: "Instant",
    completion: 97,
    trades: 133,
    speed: 3,
    verified: false,
  },
];

export function getP2PListingById(id?: string) {
  return p2pListings.find((listing) => listing.id === id);
}
