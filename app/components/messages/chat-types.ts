export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderName?: string;
  content: string;
  imageUrl?: string | null;
  offerAmount?: number | null;
  offerQuantity?: number | null;
  offerStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  localStatus?: "sending" | "failed";
};

export type ChatConversation = {
  id: number;
  buyerId?: number;
  sellerId?: number;
  productId: number;
  product?: {
    id?: number;
    name?: string;
    price?: number;
    quantity?: number;
    imageUrl?: string | null;
  };
  counterpart?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
};

export type CheckoutOrder = {
  id?: number;
  code?: string;
  status?: string;
  statusText?: string;
  quantity?: number;
  unitPrice?: number;
} | null;
