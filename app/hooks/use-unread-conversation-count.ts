import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  refreshUnreadConversationCount,
  subscribeUnreadConversationCountSync,
  useChatStore,
} from "@/stores/chat-store";

export function useUnreadConversationCount() {
  const { user } = useAuth();
  const count = useChatStore((state) => state.unreadConversationCount);
  const userId = user?.id;

  const refreshUnreadConversationCountSafely = useCallback(async () => {
    if (!userId) return;
    await refreshUnreadConversationCount();
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadConversationCountSafely();
    }, [refreshUnreadConversationCountSafely]),
  );

  useEffect(() => {
    return subscribeUnreadConversationCountSync(userId);
  }, [userId]);

  return {
    unreadConversationCount: count,
    refreshUnreadConversationCount: refreshUnreadConversationCountSafely,
  };
}
