# Cope Wallet

**Free anonymous temp wallet for all EVM chains. No signup, no KYC, no tracking.**

🌐 [copewallet.com](https://copewallet.com) · 📄 [Apache 2.0](./LICENSE)

---

## What is Cope Wallet?

Cope Wallet is a browser-based ephemeral crypto wallet. Open the site, get an instant anonymous Ethereum address, use it, close the tab — it's gone. No account, no email, no server ever sees your private key.

Designed for: throwaway addresses, anonymous DeFi interactions, dApp testing, airdrop claiming, or anytime you don't want to expose your main wallet.

---

## Features

- **Instant temp wallet** — generates a fresh EVM address on every session, no signup
- **100% anonymous** — no KYC, no email, no personal data, no tracking
- **AES-256 in-memory encryption** — private keys never leave your browser
- **Auto key rotation** — vault re-encrypts every 60 seconds
- **Multi-chain** — Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom and all EVM networks
- **WalletConnect v2** — connect to any dApp (Uniswap, Aave, OpenSea, etc.)
- **Send & receive** — ETH and all ERC-20 tokens with live fee estimation
- **Persistent vault** — optionally encrypt and save your wallet with a passphrase + PNG key file
- **Session restore** — wallet survives page refresh when session lock is enabled
- **QR code scanner** — scan recipient addresses with your camera
- **Mobile friendly** — works on iOS Safari and Android Chrome, no app needed
- **Free** — no fees, no ads, no subscription

---

## How It Works

1. Open [copewallet.com](https://copewallet.com) — wallet is generated instantly
2. Use it to receive or send crypto, connect to dApps via WalletConnect
3. Close the tab — everything is wiped from memory
4. **Optional:** click *Persist Current Session* → set a passphrase → a PNG key file is downloaded. Drop the PNG + passphrase next time to restore your wallet

---

## Security Model

- Private keys generated entirely in-browser via [ethers.js](https://ethers.org)
- Encrypted with AES-256 (CryptoJS) using an ephemeral session key
- Session key rotates every 60 seconds — vault re-encrypted on each rotation
- Memory vault uses scattered shards to resist heap inspection
- No analytics, no cookies, no fingerprinting
- Integrity watchers wipe the vault on tampering detection
- `beforeunload` handler clears all in-memory state on tab close

---

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [ethers.js v6](https://ethers.org)
- [Reown WalletKit](https://reown.com) (WalletConnect v2)
- [CryptoJS](https://github.com/brix/crypto-js) — AES-256 encryption
- [Supabase](https://supabase.com) — asset storage + kill-switch
- [jsQR](https://github.com/cozmo/jsQR) — QR code scanning fallback
- TypeScript · Tailwind CSS · Framer Motion

---

## Running Locally

```bash
git clone https://github.com/luci-kefs/copewallet.git
cd copewallet
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_EXTERNAL_LINK=https://copewallet.com
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: your feature'`
4. Push and open a PR

---

## License

[Apache 2.0](./LICENSE) — free to use, modify, and distribute. Patent protection included.
