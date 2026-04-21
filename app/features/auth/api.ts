import { GoogleSignin } from "@react-native-google-signin/google-signin";

import type {
  AuthTokensResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from "@/features/auth/types";
import { axiosInstance, saveTokens } from "@/utils/axios";

export async function persistAuthSession(tokens: AuthTokensResponse) {
  await saveTokens(tokens.accessToken, tokens.refreshToken);
}

export async function loginUser(payload: LoginPayload) {
  const { data } = await axiosInstance.post<AuthTokensResponse>(
    "/auth/login",
    payload,
  );

  await persistAuthSession(data);
  return data;
}

export async function registerUser(payload: RegisterPayload) {
  const { data } = await axiosInstance.post<RegisterResponse>(
    "/auth/register",
    payload,
  );

  return data;
}

export async function loginWithGoogle() {
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signOut();

  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo.data?.idToken;
  if (userInfo.type === "cancelled") {
    throw new Error("Google sign-in was cancelled.");
  }
  const { data } = await axiosInstance.post<AuthTokensResponse>(
    "/auth/google-login",
    { token: idToken },
  );

  await persistAuthSession(data);
  return data;
}
