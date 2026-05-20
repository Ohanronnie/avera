import { io, Socket } from "socket.io-client";
import { useAppStore } from "@/stores/app-store";
import { BASE_URL, getAccessToken } from "./axios";

let socket: Socket | null = null;
let socketToken: string | null = null;

export const getSocket = (): Socket => {
  const token = getAccessToken();

  if (socket && socketToken !== token) {
    console.log("[chat/socket] token changed, resetting socket", {
      hadSocket: Boolean(socket),
      hadPreviousToken: Boolean(socketToken),
      hasNextToken: Boolean(token),
    });
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    socketToken = token;
    console.log("[chat/socket] creating socket", {
      baseUrl: `${BASE_URL}/chat`,
      hasToken: Boolean(token),
    });
    socket = io(`${BASE_URL}/chat`, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      useAppStore.getState().setSocketConnected(true);
      useAppStore.getState().setIsOnline(true);
      console.log("[chat/socket] connected", {
        id: socket?.id,
        connected: socket?.connected,
      });
    });

    socket.on("disconnect", (reason) => {
      useAppStore.getState().setSocketConnected(false);
      console.log("[chat/socket] disconnected", { reason });
    });

    socket.on("connect_error", (error) => {
      useAppStore.getState().setSocketConnected(false);
      useAppStore.getState().setIsOnline(false);
      console.error("[chat/socket] connect_error", {
        message: error.message,
        name: error.name,
      });
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  useAppStore.getState().setIsOnline(true);
  socketToken = getAccessToken();
  s.auth = { token: socketToken };
  console.log("[chat/socket] connectSocket called", {
    connected: s.connected,
    hasToken: Boolean(socketToken),
  });
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
  useAppStore.getState().setSocketConnected(false);
  socket = null;
  socketToken = null;
};
