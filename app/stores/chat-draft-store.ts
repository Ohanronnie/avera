import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mmkvStorage } from "@/stores/mmkv-storage";

type PendingMediaItem = {
  uri: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
};

type ConversationDraft = {
  message: string;
  offerAmount: string;
  buyQuantity: number;
  pendingMedia: PendingMediaItem[];
};

type ChatDraftStore = {
  activeConversationId: number | null;
  drafts: Record<number, ConversationDraft>;
  setActiveConversationId: (conversationId: number | null) => void;
  updateDraft: (
    conversationId: number,
    value: Partial<ConversationDraft>,
  ) => void;
  clearDraft: (conversationId: number) => void;
};

const EMPTY_CONVERSATION_DRAFT: ConversationDraft = {
  message: "",
  offerAmount: "",
  buyQuantity: 1,
  pendingMedia: [],
};

const createConversationDraft = (): ConversationDraft => ({
  ...EMPTY_CONVERSATION_DRAFT,
  pendingMedia: [],
});

export const useChatDraftStore = create<ChatDraftStore>()(
  persist(
    (set) => ({
      activeConversationId: null,
      drafts: {},
      setActiveConversationId: (activeConversationId) =>
        set({ activeConversationId }),
      updateDraft: (conversationId, value) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [conversationId]: {
              ...(state.drafts[conversationId] || createConversationDraft()),
              ...value,
            },
          },
        })),
      clearDraft: (conversationId) =>
        set((state) => {
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[conversationId];
          return { drafts: nextDrafts };
        }),
    }),
    {
      name: "avera-chat-draft-store",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
        drafts: state.drafts,
      }),
    },
  ),
);

export const getConversationDraft = (conversationId: number) =>
  useChatDraftStore.getState().drafts[conversationId] ||
  EMPTY_CONVERSATION_DRAFT;
