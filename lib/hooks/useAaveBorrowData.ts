'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { aavePoolAbi, uiPoolDataProviderAbi } from '@/lib/abi/aavePool';
import { AAVE_V3 } from '@/lib/config/addresses';
import type { Opportunity } from '@/lib/protocols/types';
import { useErc20Balance } from './useErc20Balance';

const AAVE_BASE_DECIMALS = 8n;
const HF_DECIMALS = 18n;

type UserAccountData = readonly [bigint, bigint, bigint, bigint, bigint, bigint];

export interface AaveBorrowData {
  enabled: boolean;
  loading: boolean;
  borrowable: boolean;
  availableBorrowsBase: bigint;
  availableBorrowsUsdc: bigint;
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  totalDebtUsdc: bigint;
  ltvBps: number;
  liquidationThresholdBps: number;
  healthFactorRaw: bigint;
  healthFactorDisplay: string;
  variableDebtToken?: `0x${string}`;
  variableDebtUsdc: bigint;
  refetch: () => Promise<unknown>;
}

function formatHealthFactor(raw: bigint): string {
  const whole = raw / 10n ** HF_DECIMALS;
  const frac = (raw % 10n ** HF_DECIMALS) / 10n ** (HF_DECIMALS - 2n);
  return `${whole}.${frac.toString().padStart(2, '0')}`;
}

export function useAaveBorrowData(
  opportunity: Opportunity,
  address: `0x${string}` | undefined,
): AaveBorrowData {
  const isAave = opportunity.protocol === 'aave-v3';
  const cfg = isAave ? AAVE_V3[opportunity.chainId] : undefined;

  const reservesData = useReadContract({
    address: cfg?.uiPoolDataProvider,
    abi: uiPoolDataProviderAbi,
    functionName: 'getReservesData',
    args: cfg ? [cfg.poolAddressesProvider] : undefined,
    chainId: opportunity.chainId,
    query: { enabled: Boolean(cfg) },
  });

  const usdcReserve = useMemo(() => {
    if (!cfg) return undefined;
    const reserves = reservesData.data?.[0] as
      | Array<{
          underlyingAsset: `0x${string}`;
          borrowingEnabled: boolean;
          isActive: boolean;
          isFrozen: boolean;
          variableDebtTokenAddress: `0x${string}`;
        }>
      | undefined;
    if (!reserves) return undefined;
    return reserves.find(
      (r) => r.underlyingAsset.toLowerCase() === opportunity.asset.address.toLowerCase(),
    );
  }, [cfg, reservesData.data, opportunity.asset.address]);

  const accountData = useReadContract({
    address: cfg?.pool,
    abi: aavePoolAbi,
    functionName: 'getUserAccountData',
    args: address ? [address] : undefined,
    chainId: opportunity.chainId,
    query: { enabled: Boolean(cfg && address) },
  });

  const variableDebt = useErc20Balance(usdcReserve?.variableDebtTokenAddress, address, opportunity.chainId);

  const refetch = async () => {
    await Promise.all([reservesData.refetch(), accountData.refetch(), variableDebt.refetch()]);
  };

  const empty: AaveBorrowData = {
    enabled: Boolean(cfg && address),
    loading: Boolean(cfg && (reservesData.isLoading || accountData.isLoading)),
    borrowable: false,
    availableBorrowsBase: 0n,
    availableBorrowsUsdc: 0n,
    totalCollateralBase: 0n,
    totalDebtBase: 0n,
    totalDebtUsdc: 0n,
    ltvBps: 0,
    liquidationThresholdBps: 0,
    healthFactorRaw: 0n,
    healthFactorDisplay: '0.00',
    variableDebtToken: usdcReserve?.variableDebtTokenAddress,
    variableDebtUsdc: (variableDebt.data as bigint | undefined) ?? 0n,
    refetch,
  };
  if (!cfg || !address) return empty;

  const tuple = accountData.data as UserAccountData | undefined;
  const totalCollateralBase = tuple?.[0] ?? 0n;
  const totalDebtBase = tuple?.[1] ?? 0n;
  const availableBorrowsBase = tuple?.[2] ?? 0n;
  const liquidationThresholdBps = Number(tuple?.[3] ?? 0n);
  const ltvBps = Number(tuple?.[4] ?? 0n);
  const healthFactorRaw = tuple?.[5] ?? 0n;
  const availableBorrowsUsdc = availableBorrowsBase / 10n ** (AAVE_BASE_DECIMALS - 6n);
  const totalDebtUsdc = totalDebtBase / 10n ** (AAVE_BASE_DECIMALS - 6n);

  return {
    enabled: true,
    loading: reservesData.isLoading || accountData.isLoading || variableDebt.isLoading,
    borrowable: Boolean(
      usdcReserve &&
        usdcReserve.borrowingEnabled &&
        usdcReserve.isActive &&
        !usdcReserve.isFrozen &&
        availableBorrowsBase > 0n,
    ),
    availableBorrowsBase,
    availableBorrowsUsdc,
    totalCollateralBase,
    totalDebtBase,
    totalDebtUsdc,
    ltvBps,
    liquidationThresholdBps,
    healthFactorRaw,
    healthFactorDisplay: healthFactorRaw > 0n ? formatHealthFactor(healthFactorRaw) : '0.00',
    variableDebtToken: usdcReserve?.variableDebtTokenAddress,
    variableDebtUsdc: (variableDebt.data as bigint | undefined) ?? 0n,
    refetch,
  };
}
