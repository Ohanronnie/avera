import { io, Socket } from "socket.io-client";
import { BASE_URL, getAccessToken } from "./axios";

let socket: Socket | null = null;
let socketToken: string | null = null;

export const getSocket = (): Socket => {
  const token = getAccessToken();

  if (socket && socketToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    socketToken = token;
    socket = io(`${BASE_URL}/chat`, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket"],
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  socketToken = getAccessToken();
  s.auth = { token: socketToken };
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
  socket = null;
  socketToken = null;
};
