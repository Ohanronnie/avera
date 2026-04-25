import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

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
  const [walletErrorCode, setWalletErrorCode] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletMode, setWalletMode] = useState<"crypto" | "naira">("naira");
  const [cryptoTab, setCryptoTab] = useState<"crypto" | "activity">("crypto");
  const [walletSheet, setWalletSheet] = useState<
    "naira-send" | "naira-receive" | null
  >(null);
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
      setWalletErrorCode(null);
      const [w, t] = await Promise.all([
        axiosInstance.get("/wallet"),
        axiosInstance.get("/wallet/transactions"),
      ]);
      setWallet(w.data);
      setTransactions(t.data);
    } catch (error: any) {
      setWallet(null);
      setTransactions([]);
      setWalletErrorCode(error?.response?.data?.code || "WALLET_UNAVAILABLE");
    }
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
  const nairaBalance = wallet?.nairaBalance ?? 0;
  const lockedBalance = wallet?.lockedBalance ?? 0;
  const accountName = wallet?.accountName || "";
  const accountNumber = wallet?.accountNumber || "";
  const bankName = wallet?.bankName || "";
  const needsProfileInfo = walletErrorCode === "PROFILE_INFO_REQUIRED";

  const handleReceiveCrypto = () => {
    toast.show({
      title: "Wallet ID",
      description: maskedWalletId,
      variant: "info",
    });
  };

  const handleCopyAccount = () => {
    if (!accountNumber) return;

    toast.show({
      title: "Copied",
      description: accountNumber,
      variant: "success",
    });
  };

  const handleSubmitNairaTransfer = () => {
    if (
      !transferAmount.trim() ||
      !recipientBank.trim() ||
      !recipientAccount.trim()
    ) {
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
      description:
        "Next step is adding bank verification and transfer confirmation.",
      variant: "info",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#050505]" edges={["top"]}>
      <ScrollView
        className="flex-1 bg-white dark:bg-[#050505]"
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
            <>
              {needsProfileInfo ? (
                <View className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-[#121214]">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                    <Ionicons
                      name="person-circle-outline"
                      size={28}
                      color="#2563EB"
                    />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-gray-950 dark:text-white">
                    Complete your profile
                  </Text>
                  <Text className="mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400">
                    Your Naira bank wallet will be created after your name and
                    username are set, so the account name is correct.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/profile/edit")}
                    className="mt-6 h-14 flex-row items-center justify-center rounded-full bg-brand"
                  >
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text variant="none" className="ml-2 font-bold text-white">
                      Edit Profile
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <NairaWalletContent
                    nairaBalance={nairaBalance}
                    accountName={accountName}
                    accountNumber={accountNumber || "Generating"}
                    bankName={bankName || "Avera Test Bank"}
                    onShowWithdraw={() => setWalletSheet("naira-send")}
                    onReceive={() => setWalletSheet("naira-receive")}
                    onCopyAccount={handleCopyAccount}
                  />
                  <View className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-[#101113]">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          Locked balance
                        </Text>
                        <Text className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
                          ₦
                          {Number(lockedBalance).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                        <Ionicons
                          name="lock-closed-outline"
                          size={22}
                          color="#2563EB"
                        />
                      </View>
                    </View>
                    <Text className="mt-3 text-sm leading-5 text-gray-500 dark:text-gray-400">
                      ₦
                      {Number(lockedBalance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      is currently locked and cannot be withdrawn. Deliver the
                      associated order or resolve any disputes to unlock these
                      funds.
                    </Text>
                  </View>
                </>
              )}
            </>
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
          <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Available balance
            </Text>
            <Text className="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
              ₦
              {Number(nairaBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-gray-950 dark:text-white">
              Amount
            </Text>
            <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 dark:border-white/10 dark:bg-white/5">
              <Text variant="none" className="text-xl font-semibold text-brand">
                ₦
              </Text>
              <TextInput
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                className="h-14 flex-1 px-3 text-lg font-bold text-gray-950 dark:text-white"
              />
            </View>
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-gray-950 dark:text-white">
              Bank
            </Text>
            <TextInput
              value={recipientBank}
              onChangeText={setRecipientBank}
              placeholder="Enter bank name"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-gray-950 dark:text-white">
              Account number
            </Text>
            <TextInput
              value={recipientAccount}
              onChangeText={setRecipientAccount}
              keyboardType="numeric"
              placeholder="Enter account number"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-gray-950 dark:text-white">
              Narration
            </Text>
            <TextInput
              value={transferNote}
              onChangeText={setTransferNote}
              placeholder="Optional note"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </View>

          <View className="mt-5 rounded-2xl border border-brand/20 bg-brand/10 p-4">
            <View className="flex-row items-start">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#2563EB"
              />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                Transfers will require confirmation before money leaves your
                wallet.
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={() => setWalletSheet(null)}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10"
            >
              <Text className="font-bold text-gray-950 dark:text-white">
                Cancel
              </Text>
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
          <View className="items-center rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/5">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
              <Ionicons name="business-outline" size={28} color="#2563EB" />
            </View>
            <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-gray-500">
              Wallet account
            </Text>
            <Text className="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
              {accountNumber}
            </Text>
            <Pressable
              onPress={handleCopyAccount}
              className="mt-4 flex-row items-center rounded-full bg-brand px-4 py-2"
            >
              <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
              <Text
                variant="none"
                className="ml-2 text-sm font-bold text-white"
              >
                Copy account number
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5">
            {[
              { label: "Bank", value: bankName },
              { label: "Account name", value: accountName },
              { label: "Account number", value: accountNumber },
            ].map((item, index) => (
              <View
                key={item.label}
                className={`px-5 py-4 ${
                  index !== 2
                    ? "border-b border-gray-100 dark:border-white/5"
                    : ""
                }`}
              >
                <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  {item.label}
                </Text>
                <Text className="mt-2 text-base font-bold text-gray-950 dark:text-white">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="time-outline" size={20} color="#34D399" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                Transfers to this account should reflect in your wallet after
                confirmation.
              </Text>
            </View>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
