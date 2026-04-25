import { axiosInstance } from "@/utils/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ProfileUser = {
  id?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string | null;
  coverPhotoUrl?: string | null;
  phoneNumber?: string;
  location?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zipCode?: string | null;
  };
  infoUpdated?: boolean;
};

export const profileKeys = {
  all: ["profile"] as const,
  me: ["profile", "me"] as const,
};

export const fetchMe = async () => {
  const { data } = await axiosInstance.get<ProfileUser>("/users/me");
  return data;
};

export function useMeQuery(enabled = true) {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: fetchMe,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}

type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  bio: string;
  state: string;
  city: string;
  address: string;
  country: string;
};

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfileInput) => {
      const { data } = await axiosInstance.patch<ProfileUser>(
        "/users/me",
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.me, data);
    },
  });
}
