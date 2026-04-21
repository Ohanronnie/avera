import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { disconnectSocket } from "@/utils/socket";

type UserType = {
  id?: number | string;
  [key: string]: unknown;
};
type AuthContextType = {
  user: null | UserType;
  login: (user: UserType) => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<null | UserType>(null);

  const login = useCallback((u: UserType) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      disconnectSocket();
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
