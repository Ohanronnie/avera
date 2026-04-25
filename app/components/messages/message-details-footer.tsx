import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { Text } from "@/components/themed/theme";
import type { ChatConversation, ChatMessage, CheckoutOrder } from "@/components/messages/chat-types";

type Props = {
  isDark: boolean;
  isSeller: boolean;
  isOwnProduct: boolean;
  loadingConversation: boolean;
  sending: boolean;
  sendingImage: boolean;
  message: string;
  hasPendingImages: boolean;
  pendingImageUris: string[];
  maxChatImages: number;
  conversation: ChatConversation | null;
  checkoutOrder: CheckoutOrder;
  directCheckoutActive: boolean;
  directCheckoutPaid: boolean;
  directCheckoutPending: boolean;
  directBuyLabel: string;
  buyQuantity: number;
  productNumericPrice: number;
  liveCheckoutStatus: string | null;
  buyerCheckoutStatus: string | null;
  latestIncomingOffer: ChatMessage | null | undefined;
  acceptedOfferForCheckout: ChatMessage | null;
  acceptedOfferPaid: boolean;
  acceptedOfferTotal: number;
  acceptedOfferQuantity: number;
  acceptedOfferUnitPrice: number;
  onRespondToOffer: (accepted: boolean) => void;
  onOpenOffer: () => void;
  onOpenBuyNow: () => void;
  onOpenOrder: (id: number) => void;
  onOpenOrdersTab: () => void;
  onOpenCheckoutReview: (args: {
    quantity: number;
    source: "buy_now" | "offer";
    unitPrice: number;
    offerMessageId?: number;
  }) => void;
  onPickImageMessage: () => void;
  onOpenImageViewer: (urls: Array<string | null>, index?: number) => void;
  onRemovePendingImage: (index: number) => void;
  onClearPendingImages: () => void;
  onChangeMessage: (value: string) => void;
  onFocusMessage: () => void;
  onSendMessage: () => void;
  messageInputRef: React.RefObject<TextInput | null>;
};

export function MessageDetailsFooter({
  isDark,
  isSeller,
  isOwnProduct,
  loadingConversation,
  sending,
  sendingImage,
  message,
  hasPendingImages,
  pendingImageUris,
  maxChatImages,
  conversation,
  checkoutOrder,
  directCheckoutActive,
  directCheckoutPaid,
  directCheckoutPending,
  directBuyLabel,
  buyQuantity,
  productNumericPrice,
  liveCheckoutStatus,
  buyerCheckoutStatus,
  latestIncomingOffer,
  acceptedOfferForCheckout,
  acceptedOfferPaid,
  acceptedOfferTotal,
  acceptedOfferQuantity,
  acceptedOfferUnitPrice,
  onRespondToOffer,
  onOpenOffer,
  onOpenBuyNow,
  onOpenOrder,
  onOpenOrdersTab,
  onOpenCheckoutReview,
  onPickImageMessage,
  onOpenImageViewer,
  onRemovePendingImage,
  onClearPendingImages,
  onChangeMessage,
  onFocusMessage,
  onSendMessage,
  messageInputRef,
}: Props) {
  return (
    <View className="border-t border-gray-100 bg-white px-4 pb-4 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
      {isSeller && liveCheckoutStatus ? (
        <View className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Ionicons name="receipt-outline" size={20} color="#10B981" />
            </View>
            <View className="ml-3 flex-1">
              <Text
                variant="none"
                className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
              >
                Checkout status
              </Text>
              <Text className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                {liveCheckoutStatus}
              </Text>
            </View>
          </View>
          {checkoutOrder?.id ? (
            <Pressable
              onPress={() => onOpenOrder(Number(checkoutOrder.id))}
              className="mt-4 h-10 flex-row items-center justify-center rounded-2xl bg-emerald-500"
            >
              <Ionicons name="receipt-outline" size={16} color="white" />
              <Text variant="none" className="ml-2 text-sm font-semibold text-white">
                View order
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {acceptedOfferForCheckout ? (
        <View className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <View className="flex-row items-start">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Ionicons
                name={acceptedOfferPaid ? "shield-checkmark-outline" : "card-outline"}
                size={20}
                color="#10B981"
              />
            </View>
            <View className="ml-3 flex-1">
              <Text
                variant="none"
                className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
              >
                {acceptedOfferPaid ? "Payment secured" : "Offer accepted"}
              </Text>
              <Text className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                ₦{acceptedOfferTotal.toLocaleString()}
              </Text>
              <Text className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-200">
                {acceptedOfferPaid
                  ? `${checkoutOrder?.code || "Order"} is held in escrow`
                  : `Qty ${acceptedOfferQuantity} • ₦${acceptedOfferUnitPrice.toLocaleString()} each`}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() =>
              acceptedOfferPaid
                ? checkoutOrder?.id
                  ? onOpenOrder(Number(checkoutOrder.id))
                  : onOpenOrdersTab()
                : onOpenCheckoutReview({
                    source: "offer",
                    unitPrice: acceptedOfferUnitPrice,
                    quantity: acceptedOfferQuantity,
                    offerMessageId: acceptedOfferForCheckout.id,
                  })
            }
            className="mt-4 h-11 flex-row items-center justify-center rounded-2xl bg-emerald-500"
          >
            <Ionicons
              name={acceptedOfferPaid ? "receipt-outline" : "lock-closed-outline"}
              size={16}
              color="white"
            />
            <Text variant="none" className="ml-2 text-sm font-semibold text-white">
              {acceptedOfferPaid ? "View order" : "Checkout accepted offer"}
            </Text>
          </Pressable>
        </View>
      ) : directCheckoutActive ? (
        <View className="mb-3 rounded-2xl border border-brand/20 bg-brand/10 p-4">
          <View className="flex-row items-start">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
              <Ionicons
                name={directCheckoutPaid ? "shield-checkmark-outline" : "card-outline"}
                size={20}
                color="#2563EB"
              />
            </View>
            <View className="ml-3 flex-1">
              <Text variant="none" className="text-xs font-bold uppercase tracking-widest text-brand">
                {directCheckoutPaid ? "Payment secured" : "Checkout active"}
              </Text>
              <Text className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                {buyerCheckoutStatus || `${checkoutOrder?.code || "Order"} is in progress.`}
              </Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {directCheckoutPaid
                  ? "Your payment is held in escrow."
                  : "Continue when you're ready to complete payment."}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() =>
              directCheckoutPaid && checkoutOrder?.id
                ? onOpenOrder(Number(checkoutOrder.id))
                : onOpenCheckoutReview({
                    source: "buy_now",
                    unitPrice: productNumericPrice,
                    quantity: buyQuantity,
                  })
            }
            className="mt-4 h-11 flex-row items-center justify-center rounded-2xl bg-brand"
          >
            <Ionicons
              name={directCheckoutPaid ? "receipt-outline" : "card-outline"}
              size={16}
              color="white"
            />
            <Text variant="none" className="ml-2 text-sm font-semibold text-white">
              {directCheckoutPaid ? "View order" : "Continue checkout"}
            </Text>
          </Pressable>
        </View>
      ) : isSeller ? (
        latestIncomingOffer?.offerAmount ? (
          <View className="mb-3 rounded-2xl border border-brand/20 bg-brand/10 p-4">
            <View className="flex-row items-start">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="pricetag-outline" size={20} color="#2563EB" />
              </View>
              <View className="ml-3 flex-1">
                <Text variant="none" className="text-xs font-bold uppercase tracking-widest text-brand">
                  Buyer offer
                </Text>
                <Text className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                  ₦{Number(latestIncomingOffer.offerAmount).toLocaleString()}
                </Text>
                <Text className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-200">
                  Qty {latestIncomingOffer.offerQuantity || 1} • Total ₦
                  {(
                    Number(latestIncomingOffer.offerAmount) *
                    Number(latestIncomingOffer.offerQuantity || 1)
                  ).toLocaleString()}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Accepting unlocks checkout for the buyer.
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => onRespondToOffer(false)}
                disabled={sending}
                className="h-8 flex-1 flex-row items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10"
              >
                <Ionicons name="close" size={14} color="#EF4444" />
                <Text variant="none" className="ml-2 text-sm font-bold text-red-500">
                  Reject
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onRespondToOffer(true)}
                disabled={sending}
                className="h-8 flex-1 flex-row items-center justify-center rounded-lg bg-emerald-500"
              >
                <Ionicons name="checkmark" size={14} color="white" />
                <Text variant="none" className="ml-2 text-sm font-bold text-white">
                  Accept
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null
      ) : (
        <View className="mb-3 flex-row gap-2">
          <Pressable
            onPress={onOpenOffer}
            disabled={!conversation?.id || loadingConversation}
            className={`flex-1 items-center justify-center rounded-2xl py-3 ${
              conversation?.id && !loadingConversation
                ? "bg-gray-50 dark:bg-white/5"
                : "bg-gray-100 opacity-60 dark:bg-white/5"
            }`}
          >
            <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
              Offer price
            </Text>
          </Pressable>
          <Pressable
            onPress={onOpenBuyNow}
            disabled={isOwnProduct}
            className={`flex-1 items-center justify-center rounded-2xl py-3 ${
              isOwnProduct ? "bg-gray-100 dark:bg-white/5" : "bg-brand/10"
            }`}
          >
            <Text
              variant="none"
              className={`text-xs font-bold ${
                isOwnProduct ? "text-gray-500 dark:text-gray-400" : "text-brand"
              }`}
            >
              {directBuyLabel}
            </Text>
          </Pressable>
        </View>
      )}

      {hasPendingImages ? (
        <View className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3 pr-4">
              {pendingImageUris.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  onPress={() => onOpenImageViewer(pendingImageUris, index)}
                  className="relative"
                >
                  <Image
                    source={{ uri }}
                    className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-white/10"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => onRemovePendingImage(index)}
                    disabled={sendingImage}
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/70"
                  >
                    <Ionicons name="close" size={15} color="white" />
                  </Pressable>
                </Pressable>
              ))}
              {pendingImageUris.length < maxChatImages ? (
                <Pressable
                  onPress={onPickImageMessage}
                  disabled={sendingImage}
                  className="h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white dark:border-white/20 dark:bg-white/10"
                >
                  <Ionicons name="add" size={22} color={isDark ? "white" : "#111827"} />
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {pendingImageUris.length}/{maxChatImages} selected
            </Text>
            <Pressable onPress={onClearPendingImages} disabled={sendingImage}>
              <Text variant="none" className="text-xs font-bold text-red-500">
                Clear
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="flex-row items-end justify-center rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <Pressable
          onPress={onPickImageMessage}
          disabled={!conversation?.id || sendingImage}
          className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
            sendingImage ? "bg-gray-200 dark:bg-white/10" : "bg-white dark:bg-white/10"
          }`}
        >
          {sendingImage ? (
            <AveraLoader size={22} compact />
          ) : (
            <Ionicons name="add" size={22} color={isDark ? "white" : "#111827"} />
          )}
        </Pressable>
        <TextInput
          ref={messageInputRef}
          value={message}
          onChangeText={onChangeMessage}
          onFocus={onFocusMessage}
          placeholder="Message seller..."
          placeholderTextColor="#888"
          multiline
          className="max-h-28 flex-1 px-3 py-3 text-base text-gray-950 dark:text-white"
        />
        <Pressable
          onPress={onSendMessage}
          disabled={(!message.trim() && !hasPendingImages) || !conversation?.id || sending}
          className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
            (message.trim() || hasPendingImages) && conversation?.id && !sending
              ? "bg-brand"
              : "bg-gray-200 dark:bg-white/10"
          }`}
        >
          <Ionicons
            name="send"
            size={18}
            color={
              (message.trim() || hasPendingImages) && conversation?.id && !sending
                ? "white"
                : isDark
                  ? "#9CA3AF"
                  : "#6B7280"
            }
          />
        </Pressable>
      </View>
    </View>
  );
}
