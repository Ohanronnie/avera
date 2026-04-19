import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const handleReceiveNaira = () => {
    toast.show({
      title: "Account details",
      description: `${bankName} • ${accountNumber} • ${accountName}`,
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
              onShowWithdraw={() => setShowWithdraw((current) => !current)}
              onReceive={handleReceiveCrypto}
            />
          ) : (
            <NairaWalletContent
              nairaBalance={nairaBalance}
              accountName={accountName}
              accountNumber={accountNumber}
              bankName={bankName}
              onShowWithdraw={() => setShowWithdraw((current) => !current)}
              onReceive={handleReceiveNaira}
              onCopyAccount={handleCopyAccount}
            />
          )}

          {showWithdraw && (
            <WithdrawPanel
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              onConfirm={handleWithdraw}
              onCancel={() => setShowWithdraw(false)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
