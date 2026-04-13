# CHECKPOINT — Block 9 Complete

## Files Created
- `app/page.tsx` — Minimalist Aethilm UI (splash + vault views)
- `app/layout.tsx` — Root layout with WalletProvider, metadata
- `app/globals.css` — Black BG, scrollbar hide, noise texture
- `app/not-found.tsx` — 404 void page (Block 32)
- `app/api/proxy/route.ts` — Multi-provider RPC proxy + traffic camouflage
- `app/api/kill/route.ts` — Remote kill-switch endpoint
- `context/WalletContext.tsx` — RAM-only wallet, canary traps, key rotation
- `lib/supabase.ts` — Supabase client + asset fetcher
- `lib/crypto.ts` — AES-256, session key rotation, zeroFill
- `lib/entropy.ts` — Hybrid entropy collector (mouse, jitter, memory)
- `lib/fingerprint.ts` — Hardware UUID binding
- `lib/memory-vault.ts` — Scatter store + heap noise
- `lib/clipboard.ts` — Self-destructing clipboard (10s wipe)
- `lib/provider.ts` — GhostProvider (stealth RPC proxy)
- `lib/signer.ts` — Ephemeral zero-fill signer
- `components/GhostLink.tsx` — No-referrer external link wrapper
- `next.config.mjs` — CSP, cache headers, Referrer-Policy
- `tsconfig.json` — es2015 target + downlevelIteration

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `NEXT_PUBLIC_EXTERNAL_LINK` ✅
- `PRIVATE_RPC_URL` — user adding
- `KILL_SWITCH_SECRET` — user adding
- `SUPABASE_SERVICE_ROLE_KEY` — user adding

## Supabase Tables
- `vault_status` — remote kill-switch (id, is_killed, updated_at)
- Realtime enabled on vault_status

## Supabase Buckets
- `assets` — logo.png, favicon.ico, banner.png (user uploading)

## Architectural Decisions
- ethers v6 (`HDNodeWallet`) for wallet generation
- EPHEMERAL mode default (Block 35) — no storage ops
- All keys stored RAM-only, encrypted with `sessionKey + hardwareUUID`
- Key rotation every 60s (Block 9)
- Proxy camouflages payloads as `{ logType: "system_event", data: base64 }`
- CSP restricts all connects to self + Supabase only
- ZWNJ watermarks in branding text (Block 12)

## Stopped At: Block 9
