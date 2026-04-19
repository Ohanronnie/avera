import { useMemo } from "react";
import { View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { CHART_HEIGHT, CHART_POINTS } from "@/components/wallet/data";

export function WalletChart() {
  const chartData = useMemo(() => CHART_POINTS.map((value) => ({ value })), []);

  return (
    <View className="mt-4">
      <LineChart
        data={chartData}
        height={CHART_HEIGHT}
        color="#2563EB"
        thickness={3}
        curved
        areaChart
        hideDataPoints
        hideAxesAndRules
        hideYAxisText
        disableScroll
        adjustToWidth
        initialSpacing={0}
        endSpacing={0}
        spacing={24}
        startFillColor="#2563EB"
        endFillColor="#2563EB"
        startOpacity={0.24}
        endOpacity={0.02}
        isAnimated
        animationDuration={700}
        backgroundColor="#0F0F10"
      />
    </View>
  );
}
