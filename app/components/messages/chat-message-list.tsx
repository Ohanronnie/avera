import { Fragment } from "react";

import { ChatMessageItem } from "@/components/messages/chat-message-item";

import type { ChatMessage } from "./chat-types";

type Props = {
  messages: ChatMessage[];
  currentUserId?: number | null;
  getMediaUrl: (path?: string | null) => string | null;
  getMessageSenderName: (item: ChatMessage) => string;
  formatMessageTime: (createdAt: string) => string;
  getMessageStatus: (item: ChatMessage) => string;
  isSameUserId: (
    first?: number | string | null,
    second?: number | string | null,
  ) => boolean;
  openImageViewer: (urls: Array<string | null>, index?: number) => void;
};

export function ChatMessageList(props: Props) {
  const renderedItems = props.messages.flatMap((item, index, items) => {
    const previous = items[index - 1];
    const isCheckoutStatusMessage = item.content.startsWith("Checkout status:");
    const isImageOnly = Boolean(item.imageUrl) && !item.content;
    const isImageBatchContinuation =
      isImageOnly &&
      props.isSameUserId(previous?.senderId, item.senderId) &&
      Boolean(previous?.imageUrl) &&
      !previous?.content;

    if (isCheckoutStatusMessage || isImageBatchContinuation) {
      return [];
    }

    let lastBatchIndex = index;
    const imageBatch = [item];
    if (isImageOnly) {
      for (let batchIndex = index + 1; batchIndex < items.length; batchIndex += 1) {
        const batchItem = items[batchIndex];
        if (
          !props.isSameUserId(batchItem.senderId, item.senderId) ||
          !batchItem.imageUrl ||
          batchItem.content
        ) {
          break;
        }
        lastBatchIndex = batchIndex;
        imageBatch.push(batchItem);
      }
    }

    return [
      <ChatMessageItem
        key={item.id}
        item={item}
        imageBatch={imageBatch}
        previous={previous}
        next={items[lastBatchIndex + 1]}
        currentUserId={props.currentUserId}
        getMediaUrl={props.getMediaUrl}
        getMessageSenderName={props.getMessageSenderName}
        formatMessageTime={props.formatMessageTime}
        getMessageStatus={props.getMessageStatus}
        isSameUserId={props.isSameUserId}
        openImageViewer={props.openImageViewer}
      />,
    ];
  });

  return <Fragment>{renderedItems}</Fragment>;
}
