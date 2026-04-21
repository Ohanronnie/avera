import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Use environment variable or fallback
 export const BASE_URL = "http://172.20.10.2:3000";
// || !__DEV__
//   ? Platform.OS === "ios"
//     ? "http://localhost:3000/"
//     : "10.0.2.2:3000"
//   : "https://fern-jungle-mountain.tunnel.rxnnie.tech";

// In-memory cache for tokens (faster than SecureStore lookups on every request)
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Create Axios instance
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// === SecureStore helpers ===
const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Failed to get ${key} from SecureStore:`, error);
    return null;
  }
};

const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Failed to set ${key} in SecureStore:`, error);
  }
};

const clearSecureItems = async () => {
  try {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    accessToken = null;
    refreshToken = null;
  } catch (error) {
    console.error("Failed to clear tokens from SecureStore:", error);
  }
};

// === Token management ===
const loadTokensFromStore = async () => {
  accessToken = await getSecureItem("accessToken");
  refreshToken = await getSecureItem("refreshToken");
};

export const getAccessToken = () => accessToken;

const saveTokens = async (newAccess: string, newRefresh: string) => {
  accessToken = newAccess;
  refreshToken = newRefresh;
  await setSecureItem("accessToken", newAccess);
  await setSecureItem("refreshToken", newRefresh);
};

// === Refresh logic ===
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
    refreshToken,
  });

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    response.data;
  console.log("Tokens refreshed successfully");
  await saveTokens(newAccessToken, newRefreshToken);
  return newAccessToken;
};

// === Interceptors ===
axiosInstance.interceptors.request.use(
  async (config) => {
    // await new Promise((res, rej) => setTimeout(res, 5000))
    // If tokens are not in memory, load them once from storage
    if (!accessToken || !refreshToken) {
      await loadTokensFromStore();
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle expired access token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.startsWith("/auth")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        console.error("Token refresh failed, logging out user...");
        console.log(JSON.stringify(refreshError.response?.data, null, 2));
        // Clear tokens and redirect to login flow
        await clearSecureItems();
        // Optionally trigger navigation or state reset here

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
