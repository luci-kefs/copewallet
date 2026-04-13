// Multi-Chain Configuration
export interface Chain {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  rpcEnvKey: string;
  explorerUrl: string;
  coingeckoId: string;
  color: string;
  isAlchemy: boolean;
  logoUrl?: string; // CoinGecko image (already in CSP img-src allowlist)
  isTestnet?: boolean;
}

// CoinGecko coin image URLs — stable, covered by img-src CSP
const CG = 'https://assets.coingecko.com/coins/images';

export const CHAINS: Chain[] = [
  { id: 1,     name: 'Ethereum',      shortName: 'ETH',    symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL',          explorerUrl: 'https://etherscan.io',           coingeckoId: 'ethereum',           color: '#627EEA', isAlchemy: true,  logoUrl: `${CG}/279/small/ethereum.png`                              },
  { id: 8453,  name: 'Base',          shortName: 'BASE',   symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_BASE',     explorerUrl: 'https://basescan.org',           coingeckoId: 'ethereum',           color: '#0052FF', isAlchemy: true,  logoUrl: `${CG}/11090/small/base-symbol.png`                         },
  { id: 42161, name: 'Arbitrum',      shortName: 'ARB',    symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_ARBITRUM', explorerUrl: 'https://arbiscan.io',            coingeckoId: 'ethereum',           color: '#28A0F0', isAlchemy: true,  logoUrl: `${CG}/16547/small/arb.jpg`                                 },
  { id: 10,    name: 'Optimism',      shortName: 'OP',     symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_OPTIMISM', explorerUrl: 'https://optimistic.etherscan.io',coingeckoId: 'ethereum',           color: '#FF0420', isAlchemy: true,  logoUrl: `${CG}/25244/small/Optimism.png`                            },
  { id: 137,   name: 'Polygon',       shortName: 'MATIC',  symbol: 'POL',   rpcEnvKey: 'PRIVATE_RPC_URL_POLYGON',  explorerUrl: 'https://polygonscan.com',        coingeckoId: 'matic-network',      color: '#8247E5', isAlchemy: true,  logoUrl: `${CG}/4713/small/polygon.png`                              },
  { id: 324,   name: 'zkSync Era',    shortName: 'ZK',     symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_ZKSYNC',   explorerUrl: 'https://explorer.zksync.io',     coingeckoId: 'ethereum',           color: '#1755F4', isAlchemy: true,  logoUrl: `${CG}/24091/small/zksync.png`                              },
  { id: 59144, name: 'Linea',         shortName: 'LINEA',  symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_LINEA',    explorerUrl: 'https://lineascan.build',        coingeckoId: 'ethereum',           color: '#61DFFF', isAlchemy: true                                                                   },
  { id: 534352,name: 'Scroll',        shortName: 'SCR',    symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_SCROLL',   explorerUrl: 'https://scrollscan.com',         coingeckoId: 'ethereum',           color: '#FFDBB0', isAlchemy: true,  logoUrl: `${CG}/30173/small/scroll.png`                              },
  { id: 81457, name: 'Blast',         shortName: 'BLAST',  symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_BLAST',    explorerUrl: 'https://blastscan.io',           coingeckoId: 'ethereum',           color: '#FCFC03', isAlchemy: true,  logoUrl: `${CG}/35494/small/blast.png`                               },
  { id: 56,    name: 'BNB Chain',     shortName: 'BNB',    symbol: 'BNB',   rpcEnvKey: 'PRIVATE_RPC_URL_BSC',      explorerUrl: 'https://bscscan.com',            coingeckoId: 'binancecoin',        color: '#F3BA2F', isAlchemy: false, logoUrl: `${CG}/825/small/bnb-icon2_2x.png`                          },
  { id: 43114, name: 'Avalanche',     shortName: 'AVAX',   symbol: 'AVAX',  rpcEnvKey: 'PRIVATE_RPC_URL_AVALANCHE',explorerUrl: 'https://snowtrace.io',           coingeckoId: 'avalanche-2',        color: '#E84142', isAlchemy: false, logoUrl: `${CG}/12559/small/Avalanche_Circle_RedWhite_Trans.png`     },
  { id: 250,   name: 'Fantom',        shortName: 'FTM',    symbol: 'FTM',   rpcEnvKey: 'PRIVATE_RPC_URL_FANTOM',   explorerUrl: 'https://ftmscan.com',            coingeckoId: 'fantom',             color: '#1969FF', isAlchemy: false, logoUrl: `${CG}/4001/small/Fantom_round.png`                         },
  { id: 100,   name: 'Gnosis',        shortName: 'GNO',    symbol: 'xDAI',  rpcEnvKey: 'PRIVATE_RPC_URL_GNOSIS',   explorerUrl: 'https://gnosisscan.io',          coingeckoId: 'xdai',               color: '#04795B', isAlchemy: false, logoUrl: `${CG}/662/small/logo_square_simple_300px.png`              },
  { id: 42220, name: 'Celo',          shortName: 'CELO',   symbol: 'CELO',  rpcEnvKey: 'PRIVATE_RPC_URL_CELO',     explorerUrl: 'https://celoscan.io',            coingeckoId: 'celo',               color: '#35D07F', isAlchemy: false, logoUrl: `${CG}/11090/small/InjXBNx9_400x400.jpg`                    },
  { id: 25,    name: 'Cronos',        shortName: 'CRO',    symbol: 'CRO',   rpcEnvKey: 'PRIVATE_RPC_URL_CRONOS',   explorerUrl: 'https://cronoscan.com',          coingeckoId: 'crypto-com-chain',   color: '#002D74', isAlchemy: false, logoUrl: `${CG}/7310/small/cro_token_logo.png`                       },
  { id: 1284,  name: 'Moonbeam',      shortName: 'GLMR',   symbol: 'GLMR',  rpcEnvKey: 'PRIVATE_RPC_URL_MOONBEAM', explorerUrl: 'https://moonscan.io',            coingeckoId: 'moonbeam',           color: '#53CBC9', isAlchemy: false, logoUrl: `${CG}/22459/small/glmr.png`                                },
  { id: 1313161554, name: 'Aurora',   shortName: 'AURORA', symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_AURORA',   explorerUrl: 'https://aurorascan.dev',         coingeckoId: 'ethereum',           color: '#78D64B', isAlchemy: false                                                                   },
  { id: 5000,  name: 'Mantle',        shortName: 'MNT',    symbol: 'MNT',   rpcEnvKey: 'PRIVATE_RPC_URL_MANTLE',   explorerUrl: 'https://explorer.mantle.xyz',   coingeckoId: 'mantle',             color: '#6EE7B7', isAlchemy: false, logoUrl: `${CG}/30980/small/token.png`                               },
  { id: 1088,  name: 'Metis',         shortName: 'METIS',  symbol: 'METIS', rpcEnvKey: 'PRIVATE_RPC_URL_METIS',    explorerUrl: 'https://andromeda-explorer.metis.io', coingeckoId: 'metis-token',   color: '#00D3FF', isAlchemy: false, logoUrl: `${CG}/15595/small/metis.png`                               },
  { id: 1101,  name: 'Polygon zkEVM', shortName: 'ZKEVM',  symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_ZKEVM',    explorerUrl: 'https://zkevm.polygonscan.com',  coingeckoId: 'ethereum',           color: '#7B3FE4', isAlchemy: false                                                                   },
  { id: 2222,  name: 'Kava',          shortName: 'KAVA',   symbol: 'KAVA',  rpcEnvKey: 'PRIVATE_RPC_URL_KAVA',     explorerUrl: 'https://kavascan.com',           coingeckoId: 'kava',               color: '#FF433E', isAlchemy: false, logoUrl: `${CG}/9761/small/kava.png`                                 },
  { id: 8217,  name: 'Klaytn',        shortName: 'KLAY',   symbol: 'KLAY',  rpcEnvKey: 'PRIVATE_RPC_URL_KLAYTN',   explorerUrl: 'https://scope.klaytn.com',       coingeckoId: 'klay-token',         color: '#FF6A00', isAlchemy: false, logoUrl: `${CG}/9417/small/klay-token.png`                           },
  { id: 122,   name: 'Fuse',          shortName: 'FUSE',   symbol: 'FUSE',  rpcEnvKey: 'PRIVATE_RPC_URL_FUSE',     explorerUrl: 'https://explorer.fuse.io',       coingeckoId: 'fuse-network-token', color: '#B5F13B', isAlchemy: false, logoUrl: `${CG}/10347/small/fuse-logo-wordmark.png`                  },
  { id: 9001,  name: 'Evmos',         shortName: 'EVMOS',  symbol: 'EVMOS', rpcEnvKey: 'PRIVATE_RPC_URL_EVMOS',    explorerUrl: 'https://evm.evmos.org',          coingeckoId: 'evmos',              color: '#ED4E33', isAlchemy: false, logoUrl: `${CG}/20293/small/evmos.png`                               },
  // ── Testnets ──────────────────────────────────────────────────────────────
  { id: 11155111, name: 'Sepolia',     shortName: 'SEP',    symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_SEPOLIA',   explorerUrl: 'https://sepolia.etherscan.io',   coingeckoId: 'ethereum',           color: '#9B59B6', isAlchemy: true,  isTestnet: true, logoUrl: `${CG}/279/small/ethereum.png`          },
  { id: 84532,    name: 'Base Sepolia',shortName: 'BSEP',   symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_BASE_SEP',  explorerUrl: 'https://sepolia.basescan.org',   coingeckoId: 'ethereum',           color: '#5B6EF5', isAlchemy: true,  isTestnet: true, logoUrl: `${CG}/11090/small/base-symbol.png`     },
  { id: 421614,   name: 'Arb Sepolia', shortName: 'ASEP',   symbol: 'ETH',   rpcEnvKey: 'PRIVATE_RPC_URL_ARB_SEP',   explorerUrl: 'https://sepolia.arbiscan.io',    coingeckoId: 'ethereum',           color: '#3DB5E6', isAlchemy: true,  isTestnet: true, logoUrl: `${CG}/16547/small/arb.jpg`             },
];

export const DEFAULT_CHAIN = CHAINS[0]; // Ethereum

export function getChainById(id: number): Chain | undefined {
  return CHAINS.find((c) => c.id === id);
}

export function getChainByEnvKey(key: string): Chain | undefined {
  return CHAINS.find((c) => c.rpcEnvKey === key);
}

// Featured chains for quick selector (top row)
export const FEATURED_CHAINS = CHAINS.slice(0, 8);
