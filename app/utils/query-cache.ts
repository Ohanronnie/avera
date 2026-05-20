import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

import { appMMKV } from "@/stores/mmkv-storage";

const QUERY_CACHE_STORAGE_KEY = "react-query-cache";
const QUERY_CACHE_VERSION = 1;
const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

type PersistedQueryCache = {
  persistedAt: number;
  version: number;
  state: ReturnType<typeof dehydrate>;
};

const blockedQueryPrefixes: QueryKey[] = [
  ["orders", "current-order"],
  ["wallet"],
  ["checkout"],
  ["auth"],
];

const matchesBlockedPrefix = (queryKey: QueryKey) =>
  blockedQueryPrefixes.some((prefix) =>
    prefix.every((segment, index) => queryKey[index] === segment),
  );

const shouldPersistQueryKey = (queryKey: QueryKey) => {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  return !matchesBlockedPrefix(queryKey);
};

export const createAppQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 60 * 24,
        retry: 1,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
    },
  });

export const hydrateQueryCache = (queryClient: QueryClient) => {
  try {
    const rawValue = appMMKV.getString(QUERY_CACHE_STORAGE_KEY);
    if (!rawValue) return false;

    const persisted = JSON.parse(rawValue) as PersistedQueryCache;
    if (
      !persisted ||
      persisted.version !== QUERY_CACHE_VERSION ||
      Date.now() - persisted.persistedAt > QUERY_CACHE_MAX_AGE_MS
    ) {
      appMMKV.remove(QUERY_CACHE_STORAGE_KEY);
      return false;
    }

    hydrate(queryClient, persisted.state);
    return true;
  } catch (error) {
    console.warn("[query-cache] failed to hydrate cache", error);
    appMMKV.remove(QUERY_CACHE_STORAGE_KEY);
    return false;
  }
};

export const persistQueryCache = (queryClient: QueryClient) => {
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" &&
        shouldPersistQueryKey(query.queryKey),
    });

    const payload: PersistedQueryCache = {
      persistedAt: Date.now(),
      version: QUERY_CACHE_VERSION,
      state,
    };

    appMMKV.set(QUERY_CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("[query-cache] failed to persist cache", error);
  }
};

export const subscribeToQueryCachePersistence = (queryClient: QueryClient) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      persistQueryCache(queryClient);
    }, 250);
  });

  return () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    unsubscribe();
  };
};
