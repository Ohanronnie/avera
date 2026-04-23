import { connectSocket } from "./socket";

const SOCKET_ACK_TIMEOUT_MS = 8000;

export const createSocketRequestId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const emitSocketAck = async <TResponse extends { ok?: boolean }>(
  emitEvent: string,
  ackEvent: string,
  payload: Record<string, unknown>,
) => {
  const socket = connectSocket();
  const clientRequestId = createSocketRequestId();

  return new Promise<TResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(ackEvent, handleAck);
      reject(new Error("Socket request timed out"));
    }, SOCKET_ACK_TIMEOUT_MS);

    const handleAck = (response: TResponse & { clientRequestId?: string }) => {
      if (response?.clientRequestId !== clientRequestId) return;
      clearTimeout(timeout);
      socket.off(ackEvent, handleAck);
      resolve(response);
    };

    socket.on(ackEvent, handleAck);
    socket.emit(emitEvent, {
      ...payload,
      clientRequestId,
    });
  });
};
