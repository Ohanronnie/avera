import { create } from "zustand";
import type { Socket } from "socket.io-client";

import { useAppStore } from "@/stores/app-store";
import { axiosInstance } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";

type ChatStore = {
  latestUnreadConversationCountRequestId: number;
  unreadConversationCount: number;
  applyUnreadConversationCount: (count: number, requestId?: number) => void;
  resetUnreadConversationCount: () => void;
};

let unreadConversationCountSocket: Socket | null = null;
let unreadConversationCountSubscriptions = 0;

export const useChatStore = create<ChatStore>((set, get) => ({
  latestUnreadConversationCountRequestId: 0,
  unreadConversationCount: 0,
  applyUnreadConversationCount: (count, requestId) => {
    const latestRequestId = get().latestUnreadConversationCountRequestId;

    if (
      typeof requestId === "number" &&
      requestId < latestRequestId
    ) {
      return;
    }

    set({
      latestUnreadConversationCountRequestId:
        typeof requestId === "number" ? requestId : latestRequestId,
      unreadConversationCount: count,
    });
  },
  resetUnreadConversationCount: () => {
    set({
      latestUnreadConversationCountRequestId: 0,
      unreadConversationCount: 0,
    });
  },
}));

export const refreshUnreadConversationCount = async () => {
  const { latestUnreadConversationCountRequestId, applyUnreadConversationCount } =
    useChatStore.getState();
  const requestId = latestUnreadConversationCountRequestId + 1;

  try {
    const { data } = await axiosInstance.get("/chat/conversations/unread-count");
    applyUnreadConversationCount(Number(data?.count || 0), requestId);
    useAppStore.getState().markMessagesSynced();
    useAppStore.getState().setIsOnline(true);
  } catch (error) {
    useAppStore.getState().setIsOnline(false);
    console.warn("[chat] unread conversation count refresh failed", error);
  }
};

function handleSocketUnreadCount(payload: { count?: number }) {
  useChatStore
    .getState()
    .applyUnreadConversationCount(Number(payload?.count || 0));
}

function handleSocketInboxEmit() {
  void refreshUnreadConversationCount();
}

function handleSocketConnect() {
  void refreshUnreadConversationCount();
}

const detachUnreadConversationCountSocket = () => {
  if (!unreadConversationCountSocket) return;

  unreadConversationCountSocket.off(
    "conversation:unread-count",
    handleSocketUnreadCount,
  );
  unreadConversationCountSocket.off("inbox:emit", handleSocketInboxEmit);
  unreadConversationCountSocket.off("connect", handleSocketConnect);
  unreadConversationCountSocket = null;
};

const ensureUnreadConversationCountSocket = () => {
  const socket = connectSocket();

  if (unreadConversationCountSocket === socket) {
    return socket;
  }

  detachUnreadConversationCountSocket();
  unreadConversationCountSocket = socket;
  socket.on("conversation:unread-count", handleSocketUnreadCount);
  socket.on("inbox:emit", handleSocketInboxEmit);
  socket.on("connect", handleSocketConnect);

  return socket;
};

export const resetUnreadConversationCount = () => {
  useChatStore.getState().resetUnreadConversationCount();
};

export const subscribeUnreadConversationCountSync = (userId?: number | string) => {
  unreadConversationCountSubscriptions += 1;

  if (!userId) {
    resetUnreadConversationCount();
  } else {
    ensureUnreadConversationCountSocket();
    void refreshUnreadConversationCount();
  }

  return () => {
    unreadConversationCountSubscriptions = Math.max(
      0,
      unreadConversationCountSubscriptions - 1,
    );

    if (unreadConversationCountSubscriptions === 0) {
      detachUnreadConversationCountSocket();
    }
  };
};
