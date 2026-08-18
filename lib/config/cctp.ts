/**
 * Circle CCTP V2 — official addresses from
 * https://developers.circle.com/cctp/references/contract-addresses (verified 2026-08-18).
 *
 * Same TokenMessengerV2 / MessageTransmitterV2 address is used on Ethereum, Base,
 * and Arbitrum (and their Sepolia counterparts). Domain IDs are chain-specific.
 * V1 is in wind-down; this app only talks to V2.
 *
 * Native USDC from https://developers.circle.com/stablecoins/usdc-contract-addresses
 * (verified 2026-08-18). CCTP only burns Circle-issued USDC — not USDC.e and not
 * Aave’s Sepolia faucet token.
 */
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { NETWORK_MODE } from '@/lib/wagmi';

export const CCTP_STANDARD_FINALITY = 2000; // finalized — Circle docs: ≥2000 = Standard Transfer
export const CCTP_ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
/** Circle’s documented per-burn cap (native USDC, 6 decimals). */
export const CCTP_MAX_BURN = 10_000_000n * 1_000_000n;

export const CCTP_DOMAINS = [0, 3, 6] as const;

export const CCTP_IRIS_URL =
  NETWORK_MODE === 'mainnet'
    ? 'https://iris-api.circle.com'
    : 'https://iris-api-sandbox.circle.com';

export interface CctpChainConfig {
  chainId: number;
  domain: number;
  tokenMessenger: `0x${string}`;
  messageTransmitter: `0x${string}`;
  /** Native Circle USDC — CCTP will not burn Aave/bridged test tokens. */
  usdc: `0x${string}`;
  label: string;
}

const MAINNET: Record<number, CctpChainConfig> = {
  [mainnet.id]: {
    chainId: mainnet.id,
    domain: 0,
    tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    // Circle USDC contract addresses, 2026-08-18.
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    label: 'Ethereum',
  },
  [arbitrum.id]: {
    chainId: arbitrum.id,
    domain: 3,
    tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    label: 'Arbitrum',
  },
  [base.id]: {
    chainId: base.id,
    domain: 6,
    tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    label: 'Base',
  },
};

const TESTNET: Record<number, CctpChainConfig> = {
  [sepolia.id]: {
    chainId: sepolia.id,
    domain: 0,
    tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    // Circle native test USDC — not Aave Sepolia’s faucet token.
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    label: 'Sepolia',
  },
  [arbitrumSepolia.id]: {
    chainId: arbitrumSepolia.id,
    domain: 3,
    tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    label: 'Arbitrum Sepolia',
  },
  [baseSepolia.id]: {
    chainId: baseSepolia.id,
    domain: 6,
    tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    label: 'Base Sepolia',
  },
};

export const CCTP_CHAINS = NETWORK_MODE === 'mainnet' ? MAINNET : TESTNET;

export function cctpConfig(chainId: number): CctpChainConfig | undefined {
  return CCTP_CHAINS[chainId];
}

export function cctpChainList(): CctpChainConfig[] {
  return Object.values(CCTP_CHAINS);
}
