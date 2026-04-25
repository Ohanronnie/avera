import type {
  ChatConversation,
  ChatMessage,
  CheckoutOrder,
} from "@/components/messages/chat-types";
import { BASE_URL } from "@/utils/axios";

export const MIN_OFFER_PERCENT = 80;
export const MAX_CHAT_IMAGES = 5;
export const SOCKET_ACK_TIMEOUT_MS = 8000;
export const QUICK_REPLIES = [
  "Is this still available?",
  "Can you share more photos?",
  "What is your last price?",
  "Can we use escrow?",
];

export type GatewayConversationPayload = {
  conversationId?: number;
  buyerId?: number;
  sellerId?: number;
  messages?: Array<Record<string, any>>;
  counterparty?: {
    id?: number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  } | null;
  product?: {
    id?: number;
    name?: string | null;
    price?: number | string | null;
    quantity?: number | null;
    sellerId?: number | null;
    images?: Array<{ url?: string | null }> | null;
  } | null;
};

export const toNumericId = (value?: number | string | null) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
};

export const parsePriceValue = (value?: number | string | null) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = parseFloat(value.replace(/,/g, "").trim());
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
};

export const isSameUserId = (
  first?: number | string | null,
  second?: number | string | null,
) => {
  const firstId = toNumericId(first);
  const secondId = toNumericId(second);
  return Boolean(firstId && secondId && firstId === secondId);
};

export const formatPrice = (value?: number | string | null) =>
  `₦${parsePriceValue(value).toLocaleString()}`;

export const getDisplayName = (person?: {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null) => {
  const fullName = [person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return fullName || person?.username || "Avera user";
};

export const getProductImageUrl = (
  images?: Array<{ url?: string | null }> | null,
): string | null => images?.find((image) => image?.url)?.url || null;

export const parseOfferAmount = (payload: Record<string, any>) => {
  if (payload.offerAmount != null) return parsePriceValue(payload.offerAmount);
  if (typeof payload.content !== "string") return null;

  const match = payload.content.match(/^Offer:\s*[₦$]?([\d,.]+)/i);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
};

export const createChatMessage = ({
  payload,
  conversationId,
  fallbackContent,
  fallbackOfferQuantity,
  fallbackLocalStatus,
}: {
  payload: Record<string, any>;
  conversationId?: number | null;
  fallbackContent?: string;
  fallbackOfferQuantity?: number | null;
  fallbackLocalStatus?: ChatMessage["localStatus"];
}): ChatMessage => {
  const createdAt =
    typeof payload.createdAt === "string"
      ? payload.createdAt
      : new Date(payload.createdAt || Date.now()).toISOString();
  const offerAmount = parseOfferAmount(payload);
  const offerQuantity =
    payload.offerQuantity != null
      ? Number(payload.offerQuantity)
      : fallbackOfferQuantity || null;
  const content =
    payload.content ||
    fallbackContent ||
    (offerAmount
      ? `I would like to offer ₦${offerAmount.toLocaleString()} x ${offerQuantity || 1} for this item.`
      : "");

  return {
    id: Number(payload.messageId ?? payload.id ?? 0),
    conversationId: Number(payload.conversationId ?? conversationId ?? 0),
    senderId: Number(payload.senderId ?? 0),
    senderName: payload.senderName,
    content,
    imageUrl: payload.imageUrl ?? null,
    offerAmount,
    offerQuantity,
    offerStatus: payload.offerStatus ?? payload.OfferStatus ?? null,
    readAt:
      typeof payload.readAt === "string"
        ? payload.readAt
        : payload.readAt?.toISOString?.() || null,
    deliveredAt: createdAt,
    createdAt,
    localStatus: fallbackLocalStatus,
  };
};

export const normalizeConversation = ({
  payload,
  fallbackConversationId,
}: {
  payload: GatewayConversationPayload;
  fallbackConversationId?: number | null;
}): ChatConversation => ({
  id: Number(payload.conversationId || fallbackConversationId || 0),
  buyerId: toNumericId(payload.buyerId) || undefined,
  sellerId: toNumericId(payload.sellerId) || undefined,
  productId: toNumericId(payload.product?.id) || 0,
  product: {
    id: toNumericId(payload.product?.id) || undefined,
    name: payload.product?.name || "",
    price: parsePriceValue(payload.product?.price),
    quantity: Number(payload.product?.quantity || 1),
    imageUrl: getProductImageUrl(payload.product?.images),
  },
  counterpart: {
    id: toNumericId(payload.counterparty?.id) || 0,
    name: getDisplayName(payload.counterparty),
    avatarUrl: payload.counterparty?.avatarUrl || null,
  },
});

export const getMediaUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}/media/${path}`;
};

export const formatMessageTime = (createdAt: string) =>
  new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export const getMessageStatus = (item: ChatMessage) => {
  if (item.localStatus === "failed") return "Failed";
  if (item.localStatus === "sending") return "Sending";
  if (item.readAt) return "Seen";
  if (item.deliveredAt || item.createdAt) return "Delivered";
  return "Sent";
};

export const getLatestIncomingOffer = (
  messages: ChatMessage[],
  currentUserId?: number | null,
) =>
  messages
    .slice()
    .reverse()
    .find(
      (item) =>
        Boolean(item.offerAmount) &&
        !isSameUserId(item.senderId, currentUserId) &&
        (item.offerStatus || "PENDING") === "PENDING",
    ) || null;

export const getAcceptedOfferForCheckout = ({
  messages,
  currentUserId,
  isSeller,
}: {
  messages: ChatMessage[];
  currentUserId?: number | null;
  isSeller: boolean;
}) => {
  if (isSeller) return null;

  return (
    messages
      .slice()
      .reverse()
      .find(
        (item) =>
          Boolean(item.offerAmount) &&
          isSameUserId(item.senderId, currentUserId) &&
          item.offerStatus === "ACCEPTED",
      ) || null
  );
};

export const getLatestCheckoutStatus = (messages: ChatMessage[]) =>
  messages
    .slice()
    .reverse()
    .find((item) => item.content.startsWith("Checkout status:"))
    ?.content.replace("Checkout status:", "")
    .trim() || null;

export const getLiveCheckoutStatus = (
  checkoutOrder: CheckoutOrder,
  latestCheckoutStatus: string | null,
) => {
  const code = checkoutOrder?.code || "this order";

  if (checkoutOrder?.status === "PENDING_TRANSFER") return `Buyer is paying for ${code}.`;
  if (checkoutOrder?.status === "PAID_IN_ESCROW") return `Payment confirmed for ${code}.`;
  if (checkoutOrder?.status === "SELLER_PREPARING") return `${code} is being prepared.`;
  if (checkoutOrder?.status === "SHIPPED") return `${code} has shipped.`;
  if (checkoutOrder?.status === "DELIVERED") return `${code} is waiting for buyer confirmation.`;
  if (checkoutOrder?.status === "COMPLETED") return `${code} is complete.`;

  return latestCheckoutStatus;
};
