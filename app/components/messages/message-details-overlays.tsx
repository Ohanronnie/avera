import { Ionicons } from "@expo/vector-icons";
import Gallery from "react-native-awesome-gallery";
import { Image, Keyboard, Modal, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";

type ActionItem = {
  icon: string;
  title: string;
  description: string;
  tone: string;
  action?: (id: string) => void;
};

type Props = {
  isDark: boolean;
  actionsOpen: boolean;
  offerOpen: boolean;
  buyNowOpen: boolean;
  counterpartName: string;
  productId?: number;
  productName: string;
  productPrice: string;
  productImage?: string | null;
  actionItems: ActionItem[];
  viewingImageUrls: string[];
  viewingImageIndex: number;
  offerAmount: string;
  offerPercent: number | null;
  isOfferTooLow: boolean;
  minimumOfferAmount: number;
  minOfferPercent: number;
  suggestedOffers: number[];
  offerQuantity: number;
  availableQuantity: number;
  offerTotal: number;
  numericOfferAmount: number;
  sending: boolean;
  conversationId?: number;
  buyQuantity: number;
  buyTotal: number;
  onCloseImageViewer: () => void;
  onImageIndexChange: (index: number) => void;
  onCloseActions: () => void;
  onCloseOffer: () => void;
  onCloseBuyNow: () => void;
  onSetOfferAmount: (value: string) => void;
  onSetOfferQuantityDecrement: () => void;
  onSetOfferQuantityIncrement: () => void;
  onSetBuyQuantityDecrement: () => void;
  onSetBuyQuantityIncrement: () => void;
  onSubmitOffer: () => void;
  onContinueBuyNow: () => void;
  onSelectSuggestedOffer: (amount: number) => void;
  offerAmountInputRef: React.RefObject<TextInput | null>;
};

export function MessageDetailsOverlays({
  isDark,
  actionsOpen,
  offerOpen,
  buyNowOpen,
  counterpartName,
  productId,
  productName,
  productPrice,
  productImage,
  actionItems,
  viewingImageUrls,
  viewingImageIndex,
  offerAmount,
  offerPercent,
  isOfferTooLow,
  minimumOfferAmount,
  minOfferPercent,
  suggestedOffers,
  offerQuantity,
  availableQuantity,
  offerTotal,
  numericOfferAmount,
  sending,
  conversationId,
  buyQuantity,
  buyTotal,
  onCloseImageViewer,
  onImageIndexChange,
  onCloseActions,
  onCloseOffer,
  onCloseBuyNow,
  onSetOfferAmount,
  onSetOfferQuantityDecrement,
  onSetOfferQuantityIncrement,
  onSetBuyQuantityDecrement,
  onSetBuyQuantityIncrement,
  onSubmitOffer,
  onContinueBuyNow,
  onSelectSuggestedOffer,
  offerAmountInputRef,
}: Props) {
  return (
    <>
      <Modal
        visible={Boolean(viewingImageUrls.length)}
        transparent
        animationType="fade"
        onRequestClose={onCloseImageViewer}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1 flex-col">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Pressable onPress={onCloseImageViewer} className="h-11 min-w-20 items-start justify-center">
                <Text variant="none" className="text-lg font-bold text-white">
                  Close
                </Text>
              </Pressable>
              <Text variant="none" className="text-lg font-bold text-white">
                {viewingImageUrls.length > 1
                  ? `${viewingImageIndex + 1}/${viewingImageUrls.length}`
                  : "Image"}
              </Text>
              <View className="h-11 min-w-20" />
            </View>
            <View className="flex-1 pb-10">
              {viewingImageUrls.length ? (
                <Gallery
                  key={viewingImageUrls.join("|")}
                  data={viewingImageUrls}
                  initialIndex={viewingImageIndex}
                  onIndexChange={onImageIndexChange}
                  onSwipeToClose={onCloseImageViewer}
                  onTap={onCloseImageViewer}
                  disableSwipeUp
                  style={{ flex: 1, backgroundColor: "black" }}
                />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <BottomSheet
        visible={actionsOpen}
        coverTabs
        title="Conversation actions"
        subtitle={`Manage your chat with ${counterpartName}.`}
        onClose={onCloseActions}
      >
        <View className="gap-3">
          {actionItems.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => {
                onCloseActions();
                item.action?.(String(productId || ""));
              }}
              className={`flex-row items-center rounded-2xl border p-4 ${
                item.tone === "danger"
                  ? "border-red-500/10 bg-red-500/5"
                  : item.tone === "warning"
                    ? "border-yellow-500/10 bg-yellow-500/5"
                    : "border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
              }`}
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-2xl ${
                  item.tone === "danger"
                    ? "bg-red-500/10"
                    : item.tone === "warning"
                      ? "bg-yellow-500/10"
                      : "bg-white dark:bg-white/10"
                }`}
              >
                <Ionicons
                  name={item.icon as any}
                  size={21}
                  color={
                    item.tone === "danger"
                      ? "#EF4444"
                      : item.tone === "warning"
                        ? "#D97706"
                        : isDark
                          ? "white"
                          : "#111827"
                  }
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-gray-950 dark:text-white">{item.title}</Text>
                <Text className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {item.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={offerOpen}
        coverTabs
        title="Make an offer"
        subtitle="Send a price offer to the seller. This does not create an order yet."
        onClose={onCloseOffer}
      >
        <View>
          <View className="border-b border-gray-100 pb-4 dark:border-white/10">
            <Text className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Listed price
            </Text>
            <Text className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
              {productPrice}
            </Text>
          </View>

          <View className="mt-5">
            <Text className="text-base font-bold text-gray-950 dark:text-white">Your offer</Text>
            <View className="mt-3 flex-row items-center rounded-2xl border border-brand/20 bg-brand/10 px-4">
              <Text variant="none" className="text-2xl font-semibold text-brand">₦</Text>
              <TextInput
                ref={offerAmountInputRef}
                value={offerAmount}
                onChangeText={onSetOfferAmount}
                keyboardType="numeric"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Enter amount"
                placeholderTextColor="#888"
                className="h-16 flex-1 px-3 text-2xl font-semibold text-gray-950 dark:text-white"
              />
              <Pressable
                onPress={() => {
                  offerAmountInputRef.current?.blur();
                  Keyboard.dismiss();
                }}
                className="h-9 items-center justify-center rounded-full bg-white px-4 dark:bg-white/10"
              >
                <Text variant="none" className="text-xs font-semibold text-brand">Done</Text>
              </Pressable>
            </View>
            {offerPercent ? (
              <Text
                className={`mt-2 text-xs ${
                  isOfferTooLow ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {isOfferTooLow
                  ? `Minimum offer is ₦${minimumOfferAmount.toLocaleString()} (${minOfferPercent}% of listed price).`
                  : `Your offer is about ${offerPercent}% of the listed price.`}
              </Text>
            ) : (
              <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Minimum offer is{" "}
                {minimumOfferAmount
                  ? `₦${minimumOfferAmount.toLocaleString()}`
                  : `${minOfferPercent}% of the listed price`}
                .
              </Text>
            )}
          </View>

          {suggestedOffers.length > 0 ? (
            <View className="mt-4 flex-row flex-wrap">
              {suggestedOffers.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => onSelectSuggestedOffer(amount)}
                  className="mb-2 mr-2 rounded-full bg-brand/10 px-4 py-2"
                >
                  <Text variant="none" className="text-xs font-bold text-brand">
                    ₦{amount.toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-base font-bold text-gray-950 dark:text-white">Quantity</Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {availableQuantity} available
                </Text>
              </View>
              <View className="flex-row items-center rounded-full border border-gray-100 bg-white p-1 dark:border-white/10 dark:bg-white/5">
                <Pressable
                  onPress={onSetOfferQuantityDecrement}
                  disabled={offerQuantity <= 1}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    offerQuantity <= 1 ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="remove" size={18} color={isDark ? "white" : "#111827"} />
                </Pressable>
                <Text className="min-w-10 text-center text-lg font-semibold text-gray-950 dark:text-white">
                  {offerQuantity}
                </Text>
                <Pressable
                  onPress={onSetOfferQuantityIncrement}
                  disabled={offerQuantity >= availableQuantity}
                  className={`h-10 w-10 items-center justify-center rounded-full bg-brand ${
                    offerQuantity >= availableQuantity ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </View>
            </View>
            <View className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-500 dark:text-gray-400">Total offer</Text>
                <Text className="text-xl font-semibold text-brand">₦{offerTotal.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                The seller can accept, reject, or counter your offer. Payment still goes through escrow later.
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={onCloseOffer}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              <Text className="font-bold text-gray-950 dark:text-white">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSubmitOffer}
              disabled={!numericOfferAmount || isOfferTooLow || !conversationId || sending}
              className={`h-14 flex-1 items-center justify-center rounded-2xl ${
                numericOfferAmount && !isOfferTooLow && conversationId && !sending
                  ? "bg-brand"
                  : "bg-gray-300 dark:bg-white/10"
              }`}
            >
              <Text variant="none" className="font-bold text-white">Send offer</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={buyNowOpen}
        coverTabs
        title="Buy now"
        subtitle="Start checkout from this listing. Escrow protection is included."
        onClose={onCloseBuyNow}
      >
        <View>
          <View className="flex-row border-b border-gray-100 pb-4 dark:border-white/10">
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-white/10"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="cube-outline" size={22} color="#2563EB" />
              </View>
            )}
            <View className="ml-3 flex-1 justify-center">
              <Text numberOfLines={2} className="font-bold text-gray-950 dark:text-white">
                {productName}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-brand">{productPrice}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#2563EB"
              />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-gray-950 dark:text-white">Protected by escrow</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                Payment is held until the item is delivered or handed off and confirmed.
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-base font-bold text-gray-950 dark:text-white">Quantity</Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {availableQuantity} available
                </Text>
              </View>
              <View className="flex-row items-center rounded-full border border-gray-100 bg-white p-1 dark:border-white/10 dark:bg-white/5">
                <Pressable
                  onPress={onSetBuyQuantityDecrement}
                  disabled={buyQuantity <= 1}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    buyQuantity <= 1 ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="remove" size={18} color={isDark ? "white" : "#111827"} />
                </Pressable>
                <Text className="min-w-10 text-center text-lg font-semibold text-gray-950 dark:text-white">
                  {buyQuantity}
                </Text>
                <Pressable
                  onPress={onSetBuyQuantityIncrement}
                  disabled={buyQuantity >= availableQuantity}
                  className={`h-10 w-10 items-center justify-center rounded-full bg-brand ${
                    buyQuantity >= availableQuantity ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </View>
            </View>
            <View className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-500 dark:text-gray-400">Total</Text>
                <Text className="text-xl font-semibold text-brand">₦{buyTotal.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={onCloseBuyNow}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              <Text className="font-bold text-gray-950 dark:text-white">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onContinueBuyNow}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
            >
              <Text variant="none" className="font-bold text-white">Continue</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
