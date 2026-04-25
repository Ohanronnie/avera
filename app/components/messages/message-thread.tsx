import { Fragment } from "react";

import {
  MessageThreadItem,
  type MessageThreadItemShape,
} from "@/components/messages/message-thread-item";

type Props = {
  items: MessageThreadItemShape[];
  sellerName: string;
  onOpenImageViewer?: (urls: string[], index?: number) => void;
  onOpenVideoViewer?: (url: string) => void;
};

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?.*)?$/i;
const isVideoUrl = (url?: string) => Boolean(url && VIDEO_EXTENSIONS.test(url));

export function MessageThread({
  items,
  sellerName,
  onOpenImageViewer,
  onOpenVideoViewer,
}: Props) {
  const renderedItems = items.flatMap((item, index) => {
    const previous = items[index - 1];
    const isImageMessage = Boolean(item.imageUrl);
    const previousIsGroupedImage =
      Boolean(previous?.imageUrl) &&
      !isVideoUrl(previous?.imageUrl) &&
      previous?.fromMe === item.fromMe &&
      !isVideoUrl(item.imageUrl) &&
      !item.text &&
      !item.offerAmount;

    if (previousIsGroupedImage) {
      return [];
    }

    const imageBatch = [item];
    let lastBatchIndex = index;

    if (isImageMessage) {
      for (let batchIndex = index + 1; batchIndex < items.length; batchIndex += 1) {
        const batchItem = items[batchIndex];
        if (
          !batchItem.imageUrl ||
          isVideoUrl(batchItem.imageUrl) ||
          isVideoUrl(item.imageUrl) ||
          batchItem.fromMe !== item.fromMe ||
          batchItem.offerAmount ||
          batchItem.text
        ) {
          break;
        }
        imageBatch.push(batchItem);
        lastBatchIndex = batchIndex;
      }
    }

    return [
      <MessageThreadItem
        key={item.id}
        item={item}
        imageBatch={imageBatch}
        previous={previous}
        next={items[lastBatchIndex + 1]}
        sellerName={sellerName}
        onOpenImageViewer={onOpenImageViewer}
        onOpenVideoViewer={onOpenVideoViewer}
      />,
    ];
  });

  return <Fragment>{renderedItems}</Fragment>;
}
