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
    <View className="mt-4 rounded-3xl border border-white/5 bg-[#121214] p-4">
      <Text className="text-base font-semibold text-white">
        Withdraw to Bank
      </Text>
      <Text className="mt-1 text-sm text-gray-400">
        Enter how much you want to move from your wallet.
      </Text>
      <TextInput
        value={withdrawAmount}
        onChangeText={setWithdrawAmount}
        placeholder="Enter amount"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
        className="mt-4 rounded-2xl border border-white/5 bg-[#1A1A1C] px-4 py-4 text-base text-white"
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
          className="flex-1 items-center justify-center rounded-2xl bg-[#232326] py-4"
        >
          <Text className="font-bold text-gray-300">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
