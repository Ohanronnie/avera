import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";

import type {
  AuthTokensResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from "@/features/auth/types";
import { axiosInstance } from "@/utils/axios";

export async function persistAuthSession(tokens: AuthTokensResponse) {
  await SecureStore.setItemAsync("accessToken", tokens.accessToken);
  await SecureStore.setItemAsync("refreshToken", tokens.refreshToken);
}

export async function loginUser(payload: LoginPayload) {
  const { data } = await axiosInstance.post<AuthTokensResponse>(
    "/auth/login",
    payload
  );

  await persistAuthSession(data);
  return data;
}

export async function registerUser(payload: RegisterPayload) {
  const { data } = await axiosInstance.post<RegisterResponse>(
    "/auth/register",
    payload
  );

  return data;
}

export async function loginWithGoogle() {
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signOut();

  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo.data?.idToken;
  if(userInfo.type === "cancelled") {
    throw new Error("Google sign-in was cancelled.");
  }
  const { data } = await axiosInstance.post<AuthTokensResponse>(
    "/auth/google-login",
    { token: idToken }
  );

  await persistAuthSession(data);
  return data;
}
