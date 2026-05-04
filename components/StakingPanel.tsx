'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { getProvider } from '@/lib/provider';
import { ephemeralSign } from '@/lib/signer';
import { ledgerSign, LedgerEntry } from '@/lib/ledger';
import {
  STAKING_PROTOCOLS,
  fetchStakingAPYs,
  fetchStakedPositions,
  buildStakeTx,
  type StakedPosition,
} from '@/lib/staking';
import { formatUSD } from '@/lib/prices';

const MAINNET_ID = 1;

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontWeight: 700,
  outline: 'none', boxSizing: 'border-box',
};

interface Props {
  activeLedger?: LedgerEntry | null;
  ethPrice: number;
}

export function StakingPanel({ activeLedger, ethPrice }: Props) {
  const wallet = useWallet();

  const [apys, setApys] = useState<Record<string, number>>({});
  const [positions, setPositions] = useState<StakedPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<'lido' | 'rocketpool'>('lido');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeStatus, setStakeStatus] = useState<'idle' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [stakeError, setStakeError] = useState('');
  const [stakeTxHash, setStakeTxHash] = useState('');
  const [ethBalance, setEthBalance] = useState<string | null>(null);

  const address = wallet.activeAddress;

  // Fetch APYs on mount
  useEffect(() => {
    fetchStakingAPYs().then(setApys).catch(() => {});
  }, []);

  // Fetch positions + ETH balance when address changes
  const loadPositions = useCallback(async () => {
    if (!address) return;
    setLoadingPositions(true);
    try {
      const [pos, provider] = await Promise.all([
        fetchStakedPositions(address, ethPrice),
        Promise.resolve(getProvider(MAINNET_ID)),
      ]);
      setPositions(pos);
      const bal = await provider.getBalance(address);
      setEthBalance(ethers.formatEther(bal));
    } catch {}
    finally { setLoadingPositions(false); }
  }, [address, ethPrice]);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  const handleStake = async () => {
    if (!address || (!wallet.scatteredKeyStore && !activeLedger)) return;
    const amt = parseFloat(stakeAmount);
    if (!amt || amt <= 0) { setStakeError('Enter a valid ETH amount'); return; }
    if (amt < 0.001) { setStakeError('Minimum stake: 0.001 ETH'); return; }

    setStakeStatus('signing'); setStakeError(''); setStakeTxHash('');
    try {
      const provider = getProvider(MAINNET_ID);
      const amountWei = ethers.parseEther(stakeAmount);
      const nonce = await provider.getTransactionCount(address, 'latest');
      const feeData = await provider.getFeeData();
      const calldata = buildStakeTx(selectedProtocol, amountWei);

      const tx: ethers.TransactionRequest = {
        to: calldata.to,
        from: address,
        data: calldata.data,
        value: calldata.value,
        nonce,
        chainId: MAINNET_ID,
        gasLimit: 200000n,
        maxFeePerGas: feeData.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
      };

      setStakeStatus('sending');
      const signed = activeLedger
        ? await ledgerSign(activeLedger.derivationPath, tx)
        : await ephemeralSign(wallet.scatteredKeyStore!, tx);
      const sent = await provider.broadcastTransaction(signed);
      setStakeTxHash(sent.hash);
      setStakeStatus('done');
      setStakeAmount('');
      setTimeout(() => loadPositions(), 5000);
    } catch (e: unknown) {
      setStakeError(e instanceof Error ? e.message : 'Transaction failed');
      setStakeStatus('error');
    }
  };

  const proto = STAKING_PROTOCOLS.find(p => p.id === selectedProtocol)!;
  const apy = apys[selectedProtocol] ?? null;
  const ethBal = ethBalance ? parseFloat(ethBalance) : 0;
  const totalStakedUSD = positions.reduce((s, p) => s + p.balanceUSD, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Positions summary ── */}
      {loadingPositions ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(82,255,172,0.2)', borderTopColor: '#52ffac', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : positions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Your Staked Positions</p>
          {positions.map(pos => {
            const p = STAKING_PROTOCOLS.find(x => x.id === pos.protocol)!;
            return (
              <div key={pos.protocol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: `${p.color}10`, border: `1px solid ${p.color}33`, borderRadius: 12 }}>
                <div>
                  <p style={{ fontWeight: 900, color: '#fff', fontSize: 14, margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{parseFloat(pos.balance).toFixed(6)} {p.token}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 900, color: p.color, fontSize: 14, margin: 0 }}>{parseFloat(pos.balanceETH).toFixed(6)} ETH</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{formatUSD(pos.balanceUSD)}</p>
                </div>
              </div>
            );
          })}
          {totalStakedUSD > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
              <p style={{ fontSize: 10, fontWeight: 900, color: '#52ffac' }}>Total staked: {formatUSD(totalStakedUSD)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Protocol selector ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {STAKING_PROTOCOLS.map(p => (
          <button key={p.id} onClick={() => { setSelectedProtocol(p.id); setStakeStatus('idle'); setStakeError(''); }}
            style={{
              flex: 1, padding: '12px 10px', borderRadius: 12, border: `2px solid ${selectedProtocol === p.id ? p.color : 'rgba(255,255,255,0.08)'}`,
              background: selectedProtocol === p.id ? `${p.color}15` : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s',
            }}>
            <p style={{ fontWeight: 900, color: selectedProtocol === p.id ? p.color : '#aaa', fontSize: 13, margin: 0 }}>{p.name}</p>
            <p style={{ fontSize: 10, color: selectedProtocol === p.id ? `${p.color}cc` : 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{p.token}</p>
            {apys[p.id] ? (
              <p style={{ fontSize: 11, fontWeight: 900, color: '#4ade80', margin: '4px 0 0' }}>{apys[p.id].toFixed(2)}% APY</p>
            ) : (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>Loading APY…</p>
            )}
          </button>
        ))}
      </div>

      {/* ── Protocol info ── */}
      <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>{proto.description}</p>
        {apy && (
          <p style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, margin: '6px 0 0' }}>
            Staking 1 ETH → ~{(apy / 100).toFixed(4)} ETH/year
          </p>
        )}
      </div>

      {/* ── Stake form ── */}
      {stakeStatus === 'done' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 16px', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', margin: 0 }}>Staking Transaction Sent</p>
          {stakeTxHash && (
            <a href={`https://etherscan.io/tx/${stakeTxHash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {stakeTxHash.slice(0, 16)}…{stakeTxHash.slice(-8)} ↗
            </a>
          )}
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>You will receive {proto.token} tokens representing your staked ETH.</p>
          <button onClick={() => setStakeStatus('idle')}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 20px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Stake More
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Amount to Stake</p>
            {ethBalance && (
              <button onClick={() => setStakeAmount((ethBal * 0.999).toFixed(6))}
                style={{ fontSize: 9, fontWeight: 700, color: '#52ffac', background: 'transparent', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                MAX ({parseFloat(ethBalance).toFixed(4)} ETH)
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              placeholder="0.0"
              value={stakeAmount}
              onChange={e => { setStakeAmount(e.target.value); setStakeError(''); }}
              style={{ ...inp, paddingRight: 48 }}
            />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>ETH</span>
          </div>
          {stakeAmount && parseFloat(stakeAmount) > 0 && apy && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Est. annual yield: ~{(parseFloat(stakeAmount) * apy / 100).toFixed(6)} ETH ({formatUSD(parseFloat(stakeAmount) * apy / 100 * ethPrice)})
            </p>
          )}
          {stakeError && <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>{stakeError}</p>}
          <button
            onClick={handleStake}
            disabled={stakeStatus === 'signing' || stakeStatus === 'sending' || !stakeAmount || parseFloat(stakeAmount) <= 0}
            style={{
              background: stakeStatus === 'idle' || stakeStatus === 'error' ? proto.color : 'rgba(255,255,255,0.06)',
              color: stakeStatus === 'idle' || stakeStatus === 'error' ? '#000' : '#aaa',
              border: 'none', borderRadius: 12, padding: '14px 20px', fontWeight: 900, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.08em', cursor: stakeStatus === 'idle' || stakeStatus === 'error' ? 'pointer' : 'not-allowed',
              opacity: !stakeAmount || parseFloat(stakeAmount) <= 0 ? 0.4 : 1, transition: 'all 0.15s',
            }}>
            {stakeStatus === 'signing' ? 'Signing…' : stakeStatus === 'sending' ? 'Broadcasting…' : `Stake ETH via ${proto.name}`}
          </button>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
            Only available on Ethereum Mainnet · Smart contract interaction
          </p>
        </div>
      )}
    </div>
  );
}
