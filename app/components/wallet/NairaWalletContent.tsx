import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ActionCard } from "@/components/wallet/ActionCard";
import { Text } from "@/components/themed/theme";

export function NairaWalletContent({
  nairaBalance,
  accountName,
  accountNumber,
  bankName,
  onShowWithdraw,
  onReceive,
  onCopyAccount,
}: {
  nairaBalance: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  onShowWithdraw: () => void;
  onReceive: () => void;
  onCopyAccount: () => void;
}) {
  return (
    <>
      <View className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-[#121214]">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-sm font-medium uppercase tracking-widest text-gray-500">
              Naira Balance
            </Text>
            <Text className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white">
              ₦
              {Number(nairaBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View className="rounded-full bg-brand/15 px-3 py-1.5">
            <Text variant="none" className="text-xs font-semibold text-brand">
              Active
            </Text>
          </View>
        </View>

        <View className="mt-6 flex-row gap-3">
          <ActionCard
            icon="arrow-up-right"
            label="Send"
            onPress={onShowWithdraw}
          />
          <ActionCard
            icon="arrow-down-left"
            label="Receive"
            onPress={onReceive}
            iconPosition="left"
          />
        </View>
      </View>

      <View className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-[#101113]">
        <Text className="text-sm font-medium uppercase tracking-widest text-gray-500">
          Account Details
        </Text>

        <View className="mt-5 flex-row items-start justify-between border-b border-gray-100 pb-4 dark:border-white/5">
          <View>
            <Text className="text-xs uppercase tracking-widest text-gray-500">
              Account Number
            </Text>
            <Text className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">
              {accountNumber}
            </Text>
          </View>
          <Pressable
            onPress={onCopyAccount}
            className="rounded-full bg-white p-2 dark:bg-white/5"
          >
            <Ionicons name="copy-outline" size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        <View className="border-b border-gray-100 py-4 dark:border-white/5">
          <Text className="text-xs uppercase tracking-widest text-gray-500">
            Account Name
          </Text>
          <Text className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">
            {accountName}
          </Text>
        </View>

        <View className="pt-4">
          <Text className="text-xs uppercase tracking-widest text-gray-500">
            Bank
          </Text>
          <Text className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">
            {bankName}
          </Text>
        </View>
      </View>
    </>
  );
}
