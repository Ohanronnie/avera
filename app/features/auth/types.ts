export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: number;
    email: string;
  };
};

export type RegisterResponse = {
  id: number;
  email: string;
};

export type AuthFieldErrors = Record<string, string>;
