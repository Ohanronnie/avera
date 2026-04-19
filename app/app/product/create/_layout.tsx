import { Stack } from "expo-router";
import { CreateProductFlowProvider } from "@/features/product-create/context";

export default function CreateProductLayout() {
  return (
    <CreateProductFlowProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="basic-info" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="media" />
        <Stack.Screen name="review" />
      </Stack>
    </CreateProductFlowProvider>
  );
}
