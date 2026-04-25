import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { axiosInstance } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";

let unreadConversationCountState = 0;
const unreadConversationCountListeners = new Set<(count: number) => void>();

const publishUnreadConversationCount = (count: number) => {
  unreadConversationCountState = count;
  unreadConversationCountListeners.forEach((listener) => listener(count));
};

export function useUnreadConversationCount() {
  const [count, setCount] = useState(unreadConversationCountState);

  const refreshUnreadConversationCount = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(
        "/chat/conversations/unread-count",
      );
      publishUnreadConversationCount(Number(data?.count || 0));
    } catch {
      publishUnreadConversationCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadConversationCount();
    }, [refreshUnreadConversationCount]),
  );

  useEffect(() => {
    unreadConversationCountListeners.add(setCount);
    const socket = connectSocket();
    const handleUnreadCount = (payload: { count?: number }) => {
      publishUnreadConversationCount(Number(payload?.count || 0));
    };
    const handleInboxEmit = () => {
      refreshUnreadConversationCount();
    };

    socket.on("conversation:unread-count", handleUnreadCount);
    socket.on("inbox:emit", handleInboxEmit);
    socket.on("connect", refreshUnreadConversationCount);

    refreshUnreadConversationCount();

    return () => {
      unreadConversationCountListeners.delete(setCount);
      socket.off("conversation:unread-count", handleUnreadCount);
      socket.off("inbox:emit", handleInboxEmit);
      socket.off("connect", refreshUnreadConversationCount);
    };
  }, [refreshUnreadConversationCount]);

  return {
    unreadConversationCount: count,
    refreshUnreadConversationCount,
  };
}
