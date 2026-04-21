import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="search" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="create" />
      <Stack.Screen name="create-product" />
    </Stack>
  );
}
