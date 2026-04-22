import { TextInput, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/themed/theme";

export function WithdrawPanel({
  withdrawAmount,
  setWithdrawAmount,
  onConfirm,
  onCancel,
}: {
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View className="mt-4 rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-[#121214]">
      <Text className="text-base font-semibold text-gray-950 dark:text-white">
        Withdraw to Bank
      </Text>
      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Enter how much you want to move from your wallet.
      </Text>
      <TextInput
        value={withdrawAmount}
        onChangeText={setWithdrawAmount}
        placeholder="Enter amount"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
        className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-950 dark:border-white/5 dark:bg-[#1A1A1C] dark:text-white"
      />
      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onConfirm}
          className="flex-1 items-center justify-center rounded-2xl bg-brand py-4"
        >
          <Text className="font-bold text-white">Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onCancel}
          className="flex-1 items-center justify-center rounded-2xl bg-gray-100 py-4 dark:bg-[#232326]"
        >
          <Text className="font-bold text-gray-700 dark:text-gray-300">
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
