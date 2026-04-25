import { fetchMe, profileKeys } from "@/features/profile/hooks";
import { axiosInstance } from "@/utils/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ReviewOrderPayload = {
  conversationId: number;
  productId?: number;
  sellerId?: number;
  sellerName?: string | null;
  buyerName?: string | null;
  buyerAddress?: string | null;
  buyerState?: string | null;
  buyerCity?: string | null;
  offeredPrice?: number | string | null;
  offerMessageId?: number | null;
  offerQuantity?: number | null;
  source?: "buy_now" | "offer" | null;
  product?: {
    id: number;
    name?: string | null;
    price?: number | string | null;
    quantity?: number | null;
    images?: Array<{ url?: string | null }>;
  } | null;
};

export type CheckoutOrder = {
  id: number;
  code: string;
  status: string;
  statusText: string;
  totalAmount: number;
  quantity: number;
  paymentReference?: string;
  delivery?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

export type OrderDetail = {
  id: number;
  code: string;
  mode: "buying" | "selling";
  productId: number;
  conversationId?: number | null;
  source: string;
  status: string;
  statusText: string;
  step: string;
  escrowState: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  escrowFee: number;
  totalAmount: number;
  delivery: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };
  product: {
    id: number;
    name: string;
    imageUrl?: string | null;
  };
  counterparty: {
    id: number;
    name: string;
    role: string;
    avatarUrl?: string | null;
  };
  paidAt?: string | null;
  updatedAt: string;
};

type CreateOrderInput = {
  productId: number;
  conversationId?: number;
  offerMessageId?: number;
  quantity: number;
  source: "OFFER" | "BUY_NOW";
  deliveryName?: string;
  deliveryPhone: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryCountry: string;
};

type CreateOrderResponse = {
  message?: string;
  existing?: boolean;
  order?: {
    id: number;
    code: string;
    status: string;
    statusText: string;
    totalAmount: number;
  };
};

type CheckoutSessionResponse = {
  order: CheckoutOrder;
  authorizationUrl: string | null;
  alreadyPaid?: boolean;
};

type UpdateOrderStatusInput = {
  orderId: number;
  action: "prepare" | "ship" | "deliver" | "received";
};

export const orderKeys = {
  all: ["orders"] as const,
  review: (conversationId: number) =>
    ["orders", "review", conversationId] as const,
  detail: (orderId: number) => ["orders", "detail", orderId] as const,
};

export const fetchOrderReview = async (conversationId: number) => {
  const { data } = await axiosInstance.get<ReviewOrderPayload>(
    `/chat/conversations/order-review/${conversationId}`,
  );
  return data;
};

export const fetchOrderDetail = async (orderId: number) => {
  const { data } = await axiosInstance.get<OrderDetail>(`/orders/${orderId}`);
  return data;
};

export function useOrderReviewQuery(conversationId: number) {
  return useQuery({
    queryKey: orderKeys.review(conversationId),
    queryFn: () => fetchOrderReview(conversationId),
    enabled: conversationId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useOrderDetailQuery(orderId: number) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => fetchOrderDetail(orderId),
    enabled: orderId > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderInput) => {
      const { data } = await axiosInstance.post<CreateOrderResponse>(
        "/orders",
        payload,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: orderKeys.review(variables.conversationId),
        });
      }

      queryClient.invalidateQueries({ queryKey: orderKeys.all });

      if (data.order?.id) {
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail(data.order.id),
        });
      }
    },
  });
}

export function useCheckoutSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await axiosInstance.post<CheckoutSessionResponse>(
        `/orders/${orderId}/checkout-session`,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(orderKeys.detail(data.order.id), data.order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, action }: UpdateOrderStatusInput) => {
      const { data } = await axiosInstance.post<OrderDetail>(
        `/orders/${orderId}/status`,
        { action },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(orderKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useAutofillProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return queryClient.ensureQueryData({
        queryKey: profileKeys.me,
        queryFn: fetchMe,
      });
    },
  });
}
