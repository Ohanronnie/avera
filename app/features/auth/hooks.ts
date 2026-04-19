import { useMutation } from "@tanstack/react-query";

import {
  loginUser,
  loginWithGoogle,
  registerUser,
} from "@/features/auth/api";
import type {
  AuthFieldErrors,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from "@/features/auth/types";
import { getGoogleAuthErrorMessage } from "@/utils/google-auth";

type LoginMutationOptions = {
  onLoggedIn: () => void;
  onUnverified: (userId: number) => void;
  onFieldErrors: (errors: AuthFieldErrors) => void;
  onInvalidCredentials: () => void;
};

type GoogleMutationOptions = {
  onLoggedIn: () => void;
  onErrorMessage: (message: string) => void;
};

type RegisterMutationOptions = {
  onRegistered: (response: RegisterResponse) => void;
  onFieldErrors: (errors: AuthFieldErrors) => void;
  onErrorMessage: (message: string) => void;
};

export function useEmailLoginMutation({
  onLoggedIn,
  onUnverified,
  onFieldErrors,
  onInvalidCredentials,
}: LoginMutationOptions) {
  return useMutation({
    mutationFn: (payload: LoginPayload) => loginUser(payload),
    onSuccess: () => {
      onLoggedIn();
    },
    onError: (error: any) => {
      const response = error?.response?.data;

      if (response?.fieldErrors) {
        onFieldErrors(response.fieldErrors);
        return;
      }

      if (response?.code === "ACCOUNT_NOT_VERIFIED") {
        onUnverified(response.userId);
        return;
      }

      onInvalidCredentials();
    },
  });
}

export function useGoogleLoginMutation({
  onLoggedIn,
  onErrorMessage,
}: GoogleMutationOptions) {
  return useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: () => {
      onLoggedIn();
    },
    onError: (error: any) => {
      const serverMessage = error?.response?.data?.message;
      onErrorMessage(serverMessage || getGoogleAuthErrorMessage(error));
    },
  });
}

export function useRegisterMutation({
  onRegistered,
  onFieldErrors,
  onErrorMessage,
}: RegisterMutationOptions) {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),
    onSuccess: (response) => {
      onRegistered(response);
    },
    onError: (error: any) => {
      const backendErrors = error?.response?.data?.fieldErrors;

      if (backendErrors && typeof backendErrors === "object") {
        const formatted = Object.keys(backendErrors).reduce<AuthFieldErrors>(
          (acc, field) => {
            acc[field] = Array.isArray(backendErrors[field])
              ? backendErrors[field][0]
              : backendErrors[field];
            return acc;
          },
          {}
        );

        onFieldErrors(formatted);
        return;
      }

      onErrorMessage(error?.response?.data?.message || "Registration failed");
    },
  });
}
