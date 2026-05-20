# Zustand Migration Todo

## Principles

- Keep `React Query` for server state.
- Use `Zustand` for shared client state only.
- Do not migrate every `useState`; only shared or cross-screen state.
- Migrate one domain at a time and verify before moving on.

## 1. Setup

Files:
- `app/stores/`
- `app/stores/index.ts` (optional shared exports)

Tasks:
- Install `zustand`.
- Create the shared store folder structure.
- Define store conventions:
  - one domain per store
  - selectors for reads
  - actions grouped inside the store
  - no backend fetch lifecycle in stores unless it is purely client sync glue
- Document the rule: `React Query = server state`, `Zustand = shared client state`.
- Decide whether persistence is immediate or postponed.

## 2. Unread Count Store

Files:
- `app/stores/chat-store.ts`
- `app/hooks/use-unread-conversation-count.ts`
- `app/contexts/AuthContext.tsx`
- `app/app/(tabs)/_layout.tsx`
- `app/app/(tabs)/orders.tsx`
- `app/app/(tabs)/profile.tsx`

Tasks:
- Create unread badge state and actions in a store.
- Move refresh and reset logic behind store actions.
- Keep socket subscription ownership singleton-safe.
- Replace module globals and listener sets.
- Verify logout clears unread badge state.

## 3. App/System Store

Files:
- `app/stores/app-store.ts`
- likely touch points:
  - `app/app/_layout.tsx`
  - `app/utils/socket.ts`

Tasks:
- Add `isOnline`.
- Add `socketConnected`.
- Add sync timestamps.
- Add shared banner or app-level UI flags where needed.
- Prepare this store for future offline and sync UX.

## 4. Chat Draft Store

Files:
- `app/stores/chat-draft-store.ts` or extend `app/stores/chat-store.ts`
- `app/app/messages/[id].tsx`
- `app/app/messages/index.tsx`
- `app/features/messages/use-message-details.ts`

Tasks:
- Persist draft text by conversation id.
- Persist pending media by conversation id.
- Track active conversation id.
- Keep message composer state across navigation.
- Reduce duplicated local draft state.

## 5. Search/Browse Store

Files:
- `app/stores/search-store.ts`
- `app/app/(tabs)/home.tsx`
- `app/app/product/search.tsx`
- `app/app/product/categories.tsx`

Tasks:
- Store `query`.
- Store `categoryId`.
- Store `condition`.
- Store `sort`.
- Store recent searches.
- Reuse the same filters across browse and search entry points.

## 6. Checkout Draft Store

Files:
- `app/stores/checkout-store.ts`
- `app/app/checkout/review.tsx`
- `app/app/checkout/pay.tsx`
- `app/app/checkout/success.tsx`
- `app/app/messages/[id].tsx`

Tasks:
- Store selected quantity.
- Store delivery form draft values.
- Store selected order-review context.
- Store flow-local UI state.
- Keep payment and checkout actions online-only.

## 7. Profile/Preferences Store

Files:
- `app/stores/profile-ui-store.ts` or `app/stores/preferences-store.ts`
- `app/app/(tabs)/profile.tsx`
- `app/app/profile/edit.tsx`
- `app/app/(auth)/user-info.tsx`

Tasks:
- Add local edit draft state where useful.
- Add onboarding progress UI state.
- Add lightweight preferences.
- Keep remote profile fetch and update outside Zustand.

## 8. Wishlist Optimistic UI

Files:
- `app/stores/wishlist-ui-store.ts` if needed
- `app/app/(tabs)/wishlist.tsx`
- wishlist toggle entry points in product cards and product details
- `app/features/wishlist/hooks.ts`

Tasks:
- Add optimistic toggle state only if the current flow is awkward.
- Keep backend fetch and mutation in `React Query`.
- Ensure shared heart state updates across screens.

## 9. Modal/Sheet Coordination

Files:
- `app/stores/ui-store.ts`
- `app/components/ui/bottom-sheet.tsx`
- screens using shared sheets or modals

Tasks:
- Track shared bottom sheet visibility and state where cross-screen coordination exists.
- Track global modal intents only if truly shared.
- Avoid moving purely local modal state unnecessarily.

## 10. MMKV Persistence Layer

Files:
- `app/stores/persist/` or similar helper area
- selected store files above

Tasks:
- Decide persistence middleware strategy.
- Persist only safe and useful slices:
  - unread badge
  - drafts
  - recent searches
  - filters
  - preferences
- Avoid persisting fragile server-derived caches by default.

## 11. Connectivity/Sync UX

Files:
- `app/stores/app-store.ts`
- route layouts and sensitive screens
- shared banner components if introduced

Tasks:
- Introduce an app-wide online/offline signal.
- Add route policies:
  - offline-first
  - offline-readonly
  - online-required
- Show connection-required states on sensitive flows.
- Show stale-data indicators on cached read-only flows.

## 12. Cleanup

Files:
- wherever module globals, repeated listeners, or duplicated shared `useState` remain

Tasks:
- Remove ad hoc module state.
- Remove redundant shared listeners.
- Convert helper hooks into thin wrappers around stores where useful.
- Keep local component state only where it is truly local.

## 13. Validation After Each Step

Tasks:
- Run TypeScript.
- Test login/logout state reset.
- Test tab switching.
- Test socket reconnect behavior.
- Test message badge consistency.
- Test checkout isolation from client-only state.
- Test that no stale user data leaks between sessions.

## Recommended Build Order

1. `app/stores/` setup
2. unread count store
3. app/system store
4. chat draft store
5. search/browse store
6. checkout draft store
7. profile/preferences store
8. wishlist optimistic UI
9. modal/sheet coordination
10. MMKV persistence
11. cleanup and validation

## Do Not Migrate

- orders fetch lifecycle
- product list fetch lifecycle
- profile fetch lifecycle
- order detail fetch lifecycle
- other backend-cached resources better handled by `React Query`
