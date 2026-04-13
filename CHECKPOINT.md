# CHECKPOINT — Block 27 Complete

## All Files Created So Far
- `app/page.tsx` — Full UI: splash, vault, fake crash, decoy states
- `app/layout.tsx` — Root layout + WalletProvider
- `app/globals.css` — Black BG, scrollbar hide, noise texture
- `app/not-found.tsx` — 404 void page
- `app/api/proxy/route.ts` — Multi-provider RPC + traffic camouflage
- `app/api/kill/route.ts` — Remote kill-switch
- `context/WalletContext.tsx` — RAM wallet, breach, history, persistent mode
- `lib/supabase.ts` — Supabase client + asset fetcher
- `lib/crypto.ts` — AES-256, key rotation, zeroFill, sha256
- `lib/entropy.ts` — Hybrid entropy (mouse, jitter, memory)
- `lib/fingerprint.ts` — Hardware UUID + environment watch
- `lib/memory-vault.ts` — Scatter store + heap noise
- `lib/clipboard.ts` — Self-destructing clipboard
- `lib/provider.ts` — GhostProvider (stealth proxy)
- `lib/signer.ts` — Ephemeral zero-fill signer
- `lib/breach.ts` — Logic bomb, integrity check, env guard
- `lib/history.ts` — URL masking, singleton tab
- `lib/persistent-vault.ts` — Sharded IndexedDB, PBKDF2 600k
- `lib/decoy.ts` — Fake crash, infinite loading, fake success
- `lib/transaction.ts` — Gas jitter, stealth delay, dummy echoes
- `lib/network-profile.ts` — Latency baseline + drift detection
- `lib/visual-entropy.ts` — Visual theme, CSS integrity watch
- `lib/webauthn.ts` — WebAuthn biometric key fusion
- `components/GhostLink.tsx` — No-referrer external link
- `components/GhostCapsule.tsx` — Closed Shadow DOM input
- `next.config.mjs` — CSP, cache, referrer headers
- `scripts/upload-assets.mjs` — Asset uploader
- `CHECKPOINT.md` — This file

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `NEXT_PUBLIC_EXTERNAL_LINK` ✅
- `PRIVATE_RPC_URL` ✅ (user added)
- `KILL_SWITCH_SECRET` ✅ (user added)
- `SUPABASE_SERVICE_ROLE_KEY` — needed for kill route

## Supabase
- Table: `vault_status` (id, is_killed) — Realtime enabled
- Bucket: `assets` — logo.png, favicon.ico, banner.png uploaded

## Architectural Decisions
- ethers v6, HDNodeWallet
- EPHEMERAL default / PERSISTENT opt-in (Block 35)
- Keys: sessionKey XOR hardwareUUID XOR biometricKey
- Proxy camouflages payloads as system_event logs
- Visual theme hash fused into SESSION_SALT each session
- Shadow DOM for sensitive inputs (closed mode)

## Stopped At: Block 27
