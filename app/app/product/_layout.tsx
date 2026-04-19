import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="categories" />
    </Stack>
  );
}
