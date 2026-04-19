import { io, Socket } from "socket.io-client";
import { BASE_URL, getAccessToken } from "./axios";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(`${BASE_URL}/chat`, {
      autoConnect: false,
      auth: { token: getAccessToken() },
      transports: ["websocket"],
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  s.auth = { token: getAccessToken() };
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
