# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# Type checking (no npx tsc — use local binary)
./node_modules/.bin/tsc --noEmit

# E2E tests — run against LIVE https://copewallet.com (not localhost)
npm run test:e2e                          # all 28 tests (headless: false, opens Chrome)
npx playwright test tests/02-persist-and-access.spec.ts   # single spec file
npx playwright test --grep "Access Vault" # single test by name
npm run test:e2e:ui                       # Playwright UI mode

# Unit tests
npm run test         # vitest run (few unit tests exist, most coverage is E2E)
```

**Important:** `playwright.config.ts` sets `baseURL: 'https://copewallet.com'`. All E2E tests hit the live deployed site. Changes must be committed and pushed to GitHub — Vercel auto-deploys in ~3 minutes — before E2E tests will reflect them.

## Architecture Overview

### Stack
Next.js 14 App Router · TypeScript · Tailwind (minimal) · ethers v6 · framer-motion · deployed on Vercel

### Key Architectural Invariants

1. **No private keys ever leave the browser.** The Next.js API routes (`/api/proxy`, `/api/tokens`, `/api/prices`, `/api/simulate`, `/api/txhistory`, `/api/nfts`) are thin server-side RPC proxies — they receive requests from the client, forward them to Alchemy/external APIs, and return results. Private keys are never sent to these routes.

2. **In-memory key storage with fragmentation.** `lib/memory-vault.ts` scatters private keys across a `Map<string, string>` with 2-char chunks interleaved with ~1.5× more decoy entries. The reassembly index is stored under `__idx__`. The `ScatteredStore` type is used wherever a private key must be held in memory.

3. **Automatic key rotation every 60s.** `lib/crypto.ts` maintains `_currentKey` and `_nextKey` in module scope (RAM only). `encryptData`/`decryptData` use `_currentKey` by default. The `WalletContext` state stores `_v_enc` (encrypted mnemonic) and `_k_enc` (encrypted private key) — both re-encrypted on every rotation.

4. **Tab-close wipes keys.** `beforeunload` fires `wipeCopeWallet({ keepSession: true })` in `WalletContext`. Session persistence is opt-in via the "Keep session on refresh" toggle, which stores the mnemonic encrypted with a stable per-browser key (`__cwvs__` in localStorage).

5. **EVM calls route through `/api/proxy`, never direct.** `lib/provider.ts` exports `GhostProvider` (extends `ethers.JsonRpcProvider`) which encodes all RPC calls as `{ logType: 'system_event', data: btoa(...) }` to camouflage traffic. **Custom chains added in Advanced Mode bypass this** — they use `ethers.JsonRpcProvider(rpcUrl)` directly because the proxy only knows about the 26 preset chains in `lib/chains.ts`.

### State Management

All wallet state lives in `context/WalletContext.tsx`. The context holds:
- `_v_enc`: AES-encrypted mnemonic (CryptoJS, rotated)
- `_k_enc`: AES-encrypted private key (CryptoJS, rotated)  
- `_u_ap`: plain EVM address (not sensitive)
- `scatteredKeyStore`: `ScatteredStore | null` — the fragmented private key, used by `ephemeralSign`
- `isSessionLocked`: **UI-only flag** for the toggle — it does NOT gate any security behavior

`WalletContext` exposes these key methods:
- `createCopeWallet()` / `importCopeWallet(mnemonic)` — both call `storeVaultBlob(id, mnemonic)` automatically
- `persistCurrentWallet(id)` — marks a history entry as saved; **does not** overwrite the vault blob with the active wallet's mnemonic (fixed bug; each wallet has its own blob)
- `switchToSavedWallet(id)` — loads mnemonic from `__cw_vault_{id}__` and calls `importCopeWallet`
- `getMnemonicForExport()` — decrypts `_v_enc` using all known keys; used only for PNG export
- `enableSessionLock()` / `disableSessionLock()` — pure on/off, write/clear `__cwvs__` in localStorage, no locking behavior

### PNG Steganography (lib/steganography.ts)

The PNG export format encodes data in the R-channel LSBs of a 256×256 canvas:
- **Header**: 4 magic bytes `[0xAE, 0x71, 0x1A, 0x4D]` + 4-byte little-endian uint32 payload length
- **Payload**: UTF-8 bytes of `JSON.stringify({ v: 1, d: secretText })` where `secretText = JSON.stringify([encryptedMnemonic1, encryptedMnemonic2, ...])`
- Each mnemonic is CryptoJS AES-encrypted with the user's passphrase before embedding
- `handlePersistSession` in `app/page.tsx` bundles ALL saved vault mnemonics (not just active) into the PNG

The `tests/helpers.ts` `decodePNGPayload` function replicates this decoding in-browser via `page.evaluate`.

### Wallet History & Vault Blobs

`lib/wallet-history.ts` maintains up to 5 wallet snapshots in `__cw_wallet_history__` (localStorage). Each entry has `isSaved: boolean`. When `isSaved = true`:
- A blob exists at `__cw_vault_{id}__` (AES-GCM encrypted with a deterministic app key — not passphrase-gated, provides obfuscation not security)
- The entry appears in the "Saved Vaults" panel in the UI

`storeVaultBlob` is called automatically when wallets are created or imported, so every history entry already has a blob. `persistCurrentWallet` just calls `markWalletSaved(id)` — it no longer overwrites the blob.

### Non-EVM Chains

Each non-EVM chain has its own `lib/{coin}.ts` module (btc, doge, bch, ltc, sol, xrp, xlm, nano, hedera, sui, aptos). All use Blockchair or chain-specific public APIs for balance/UTXOs/broadcasting — no proxy. Derivation uses BIP44 with chain-specific coin_type. These modules are imported directly by `WalletDashboard.tsx` and displayed via `NON_EVM_META` and the `NonEvmSendModal`.

### Advanced Mode (lib/custom-*.ts)

Three localStorage-backed modules: `custom-chains.ts` (`__cw_custom_chains__`), `custom-tokens.ts` (`__cw_custom_tokens__`), `custom-apis.ts` (`__cw_custom_apis__`). Custom EVM chains use direct `ethers.JsonRpcProvider(rpcUrl)` — **never** `getProvider()`.

### Security Systems

- `lib/breach.ts`: Function integrity checksums, `isUnauthorizedEnvironment()`, `poisonVault()` (1024 bytes noise overwrite), `activateSilentLockout()`
- `lib/visual-entropy.ts`: Generates a per-session CSS color theme; `startCSSIntegrityWatch()` wipes wallet if CSS variables are tampered
- `lib/history.ts`: `checkSingletonTab()` redirects if another tab is already open; `startHistoryScrubber()` periodically clears browser history entries
- `lib/network-profile.ts`: Monitors network changes
- `lib/decoy.ts`: `FAKE_CRASH_HTML` — the HTML shown on panic trigger
- Kill-switch: `app/page.tsx` polls Supabase `vault_status` table on load; if `is_killed = true`, wipes and redirects

### API Routes

All routes in `app/api/`:
- `/api/proxy` — multi-chain RPC proxy with rate limiting (60 req/min/IP) and spoofed User-Agent rotation; only routes to chains defined in `lib/chains.ts`
- `/api/tokens` — token balance fetcher (Alchemy Token API)
- `/api/prices` — CoinGecko price fetcher
- `/api/txhistory` — Alchemy transaction history
- `/api/simulate` — Alchemy transaction simulation
- `/api/nfts` — NFT fetcher
- `/api/kill` — admin endpoint

### SEO Pages

`app/` contains many SEO landing pages (e.g., `ethereum-wallet/page.tsx`, `vs/metamask/page.tsx`). These are static marketing pages, not functional wallet routes.

### E2E Test Structure

Tests in `tests/` use helpers from `tests/helpers.ts`. Key invariants:
- The live site renders **both desktop and mobile panels simultaneously** in the DOM — every locator needs `.first()` or `.filter({ visible: true })`
- `SEL` object in helpers.ts defines all button selectors (material icon prefix + uppercase text pattern)
- `persistSession()` uses `btn.dispatchEvent('click')` to bypass the `disabled` attribute that the live site sometimes applies
- PNG downloads use `uniquePngPath()` (crypto.randomBytes hex) to prevent parallel test collisions
- `decodePNGPayload()` reads R-channel LSBs and verifies the `[0xAE, 0x71, 0x1A, 0x4D]` magic before decoding

## localStorage Keys Reference

| Key | Purpose |
|-----|---------|
| `__cw_wallet_history__` | Array of `WalletSnapshot` (up to 5) |
| `__cw_vault_{id}__` | AES-GCM encrypted mnemonic blob per wallet |
| `__cwvs__` | Session-lock encrypted mnemonic (user opt-in) |
| `__cwvs_bk__` | Stable per-browser encryption key |
| `__cwsh__` | Shadow copy of session (survives wipe, for persist flow recovery) |
| `__cw_address_book__` | Array of `Contact` |
| `__cw_custom_chains__` | Array of `CustomChain` |
| `__cw_custom_tokens__` | Array of `CustomToken` |
| `__cw_custom_apis__` | Array of `CustomAPI` |

## Critical Constraints

- **Never** add LTC/BTC/other UTXO chains to `lib/chains.ts` — that array is EVM only; UTXO chains have their own `lib/{coin}.ts` modules
- **Never** use `getProvider()` for custom chains — it only routes to the 26 preset chains in `lib/chains.ts` via `/api/proxy`
- **Never** add logic to `enableSessionLock`/`disableSessionLock` that affects wallet state — they are pure localStorage read/write
- **Never** modify `lib/chains.ts`, `lib/session-lock.ts`, `lib/provider.ts`, `lib/signer.ts`, `lib/transaction.ts` without understanding the security impact — these are core security primitives

## Planned Features (Priority Order)

From competitive analysis vs MetaMask/Rabby/Rainbow/Zerion/Phantom:

1. **Token swap** (0x/1inch aggregator API) — highest retention impact
2. **Public security audit + open source** — prerequisite for power-user trust
3. **TX simulation pre-sign** (Tenderly/Blowfish API) — closes biggest dApp safety gap
4. **Phishing/dApp detection** (Blockaid) — 2026's primary attack vector
5. **Hardware wallet** (Ledger WebHID) — gates serious-user tier
6. **Fiat on-ramp** (Transak/MoonPay widget) — removes new-user acquisition barrier
7. **Portfolio aggregation** (total value across all chains)
8. **Bug bounty program** (Immunefi free tier)
9. **Lightning tab** — complete or remove (visible placeholder damages trust)
10. **Transaction history cache** (session-scoped, no backend needed)
