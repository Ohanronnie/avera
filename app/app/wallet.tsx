import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Text } from "@/components/themed/theme";
import { CryptoWalletContent } from "@/components/wallet/CryptoWalletContent";
import { NairaWalletContent } from "@/components/wallet/NairaWalletContent";
import { WalletModeToggle } from "@/components/wallet/WalletModeToggle";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import { fallbackActivity, tokenHoldings } from "@/components/wallet/data";
import { useToast } from "@/contexts/ToastContext";
import type { Transaction } from "@/components/wallet/types";
import { axiosInstance } from "@/utils/axios";

export default function WalletScreen() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletMode, setWalletMode] = useState<"crypto" | "naira">("naira");
  const [cryptoTab, setCryptoTab] = useState<"crypto" | "activity">("crypto");
  const [walletSheet, setWalletSheet] = useState<"naira-send" | "naira-receive" | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const toast = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [w, t] = await Promise.all([
        axiosInstance.get("/wallet"),
        axiosInstance.get("/wallet/transactions"),
      ]);
      setWallet(w.data);
      setTransactions(t.data);
    } catch {}
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    try {
      await axiosInstance.post("/wallet/withdraw", { amount });
      toast.show({
        title: "Withdrawal initiated",
        description: "Your withdrawal request has been submitted.",
        variant: "success",
      });
      setShowWithdraw(false);
      setWithdrawAmount("");
      load();
    } catch (err: any) {
      toast.show({
        title: "Withdrawal failed",
        description: err?.response?.data?.message || "Withdrawal failed",
        variant: "error",
      });
    }
  };

  const totalBalance = Number(wallet?.balance || 2312);
  const formattedBalance = totalBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const portfolioChange = totalBalance > 0 ? totalBalance * 0.1204 : 817.01;
  const maskedWalletId = wallet?.address || "0x675****7d2b";
  const activityFeed = transactions.length ? transactions : fallbackActivity;
  const nairaBalance = wallet?.nairaBalance ?? 1280000;
  const accountName = wallet?.accountName || "Avera Technologies Ltd";
  const accountNumber = wallet?.accountNumber || "1029384756";
  const bankName = wallet?.bankName || "Providus Bank";

  const handleReceiveCrypto = () => {
    toast.show({
      title: "Wallet ID",
      description: maskedWalletId,
      variant: "info",
    });
  };

  const handleCopyAccount = () => {
    toast.show({
      title: "Copied",
      description: accountNumber,
      variant: "success",
    });
  };

  const handleSubmitNairaTransfer = () => {
    if (!transferAmount.trim() || !recipientBank.trim() || !recipientAccount.trim()) {
      toast.show({
        title: "Complete transfer details",
        description: "Amount, bank, and account number are required.",
        variant: "error",
      });
      return;
    }

    setWalletSheet(null);
    setTransferAmount("");
    setRecipientBank("");
    setRecipientAccount("");
    setTransferNote("");
    toast.show({
      title: "Transfer preview ready",
      description: "Next step is adding bank verification and transfer confirmation.",
      variant: "info",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      <ScrollView
        className="flex-1 bg-[#050505]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-3">
          <WalletModeToggle
            walletMode={walletMode}
            setWalletMode={setWalletMode}
          />

          {walletMode === "crypto" ? (
            <CryptoWalletContent
              maskedWalletId={maskedWalletId}
              portfolioChange={portfolioChange}
              formattedBalance={formattedBalance}
              cryptoTab={cryptoTab}
              setCryptoTab={setCryptoTab}
              tokenHoldings={tokenHoldings}
              activityFeed={activityFeed}
            />
          ) : (
            <NairaWalletContent
              nairaBalance={nairaBalance}
              accountName={accountName}
              accountNumber={accountNumber}
              bankName={bankName}
              onShowWithdraw={() => setWalletSheet("naira-send")}
              onReceive={() => setWalletSheet("naira-receive")}
              onCopyAccount={handleCopyAccount}
            />
          )}

          {walletMode === "crypto" && showWithdraw && (
            <WithdrawPanel
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              onConfirm={handleWithdraw}
              onCancel={() => setShowWithdraw(false)}
            />
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={walletSheet === "naira-send"}
        coverTabs
        title="Send Naira"
        subtitle="Move money from your Avera Naira wallet to a bank account."
        onClose={() => setWalletSheet(null)}
      >
        <View>
          <View className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Available balance
            </Text>
            <Text className="mt-2 text-3xl font-black text-white">
              ₦
              {Number(nairaBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-white">Amount</Text>
            <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
              <Text variant="none" className="text-xl font-black text-brand">
                ₦
              </Text>
              <TextInput
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                className="h-14 flex-1 px-3 text-lg font-bold text-white"
              />
            </View>
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-white">Bank</Text>
            <TextInput
              value={recipientBank}
              onChangeText={setRecipientBank}
              placeholder="Enter bank name"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-white">Account number</Text>
            <TextInput
              value={recipientAccount}
              onChangeText={setRecipientAccount}
              keyboardType="numeric"
              placeholder="Enter account number"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-white">Narration</Text>
            <TextInput
              value={transferNote}
              onChangeText={setTransferNote}
              placeholder="Optional note"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
            />
          </View>

          <View className="mt-5 rounded-3xl border border-brand/20 bg-brand/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="shield-checkmark-outline" size={20} color="#2563EB" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-300">
                Transfers will require confirmation before money leaves your wallet.
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={() => setWalletSheet(null)}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-white/10"
            >
              <Text className="font-bold text-white">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmitNairaTransfer}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
            >
              <Text variant="none" className="font-bold text-white">
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={walletSheet === "naira-receive"}
        coverTabs
        title="Receive Naira"
        subtitle="Fund your wallet by transferring to this dedicated account."
        onClose={() => setWalletSheet(null)}
      >
        <View>
          <View className="items-center rounded-3xl border border-white/5 bg-white/5 p-5">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand/10">
              <Ionicons name="business-outline" size={28} color="#2563EB" />
            </View>
            <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-gray-500">
              Wallet account
            </Text>
            <Text className="mt-2 text-3xl font-black text-white">
              {accountNumber}
            </Text>
            <Pressable
              onPress={handleCopyAccount}
              className="mt-4 flex-row items-center rounded-full bg-brand px-4 py-2"
            >
              <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
              <Text variant="none" className="ml-2 text-sm font-bold text-white">
                Copy account number
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-3xl border border-white/5 bg-white/5">
            {[
              { label: "Bank", value: bankName },
              { label: "Account name", value: accountName },
              { label: "Account number", value: accountNumber },
            ].map((item, index) => (
              <View
                key={item.label}
                className={`px-5 py-4 ${index !== 2 ? "border-b border-white/5" : ""}`}
              >
                <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  {item.label}
                </Text>
                <Text className="mt-2 text-base font-bold text-white">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="time-outline" size={20} color="#34D399" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-300">
                Transfers to this account should reflect in your wallet after confirmation.
              </Text>
            </View>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
