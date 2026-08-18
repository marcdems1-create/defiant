/**
 * Non-custodial fee-on-conversion via 0x's Swap API (AllowanceHolder flavor — a regular
 * ERC-20 `approve` + one transaction, no EIP-712 Permit2 signature required, so it slots
 * into the same "approve then write" pattern already used everywhere in
 * components/DepositWithdrawModal.tsx).
 *
 * This is the mechanism behind Defiant's "convert CRV/FXS/stable and take a fee" feature
 * WITHOUT reintroducing custody: the swap transaction is built here, but it is always
 * signed and sent by the connected wallet, never by a backend signer. The fee
 * (NEXT_PUBLIC_SWAP_FEE_BPS, in basis points) is paid to NEXT_PUBLIC_SWAP_FEE_RECIPIENT
 * atomically inside that same swap transaction via 0x's swapFeeBps/swapFeeRecipient
 * parameters — see https://0x.org/docs/0x-swap-api/guides/monetize-your-app-using-swap.
 * That recipient is a cold wallet (bridge / convert trades only). Do not point it at
 * a hot operating key. Deposit/withdraw treasury fees stay off.
 *
 * VERIFIED 2026-08-13 against 0x's own documentation, official example repo
 * (github.com/0xProject/0x-examples/tree/main/swap-v2-allowance-holder-headless-example),
 * and confirmed sample responses — still not a live authenticated call (no API key
 * available in this environment), but every field/header/param name below now matches an
 * independent source instead of being a best guess: request headers (`0x-api-key`,
 * `0x-version: v2`), query params (`chainId`, `sellToken`, `buyToken`, `sellAmount`,
 * `taker`, `swapFeeToken`, `swapFeeRecipient`, `swapFeeBps`), and response fields
 * (`transaction.to/data/value`, `issues.allowance.spender`, top-level `buyAmount`/
 * `sellAmount`/`minBuyAmount` as decimal strings) all check out. Parsing below stays defensive — returns
 * null rather than guessing — but this is de-risked from "unverified" to "doc + example +
 * sample-response verified, pending one live smoke test." Get a real API key at
 * https://dashboard.0x.org and run one real quote before trusting this with funds — a
 * live 200 response is still the only way to be fully sure.
 */

const ZEROEX_QUOTE_ENDPOINT = 'https://api.0x.org/swap/allowance-holder/quote';

export interface SwapQuote {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  /** Contract the sell-token approval must target — NOT necessarily `to`. */
  allowanceTarget: `0x${string}`;
  buyAmount: bigint;
  sellAmount: bigint;
  /** Worst-case buy amount after slippage, when 0x returns `minBuyAmount`. */
  minBuyAmount: bigint;
}

/** Default slippage (1%) for the /swap page. Harvest quotes omit this. */
export const DEFAULT_SWAP_SLIPPAGE_BPS = 100;

export function swapConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ZEROEX_API_KEY?.trim());
}

interface FetchSwapQuoteParams {
  chainId: number;
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: bigint;
  taker: `0x${string}`;
  slippageBps?: number;
}

export async function fetchSwapQuote(params: FetchSwapQuoteParams): Promise<SwapQuote | null> {
  const apiKey = process.env.NEXT_PUBLIC_ZEROEX_API_KEY;
  const feeRecipient = process.env.NEXT_PUBLIC_SWAP_FEE_RECIPIENT?.trim();
  const feeBps = process.env.NEXT_PUBLIC_SWAP_FEE_BPS;
  if (!apiKey) return null;

  const qs = new URLSearchParams({
    chainId: String(params.chainId),
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount.toString(),
    taker: params.taker,
  });
  if (params.slippageBps !== undefined) {
    qs.set('slippageBps', String(params.slippageBps));
  }
  // Swap-fee params are optional so harvest-to-USDC still works when the
  // conversion fee recipient is unset (deposit/withdraw fees are a separate
  // NEXT_PUBLIC_TREASURY_ADDRESS path).
  if (feeRecipient && /^0x[a-fA-F0-9]{40}$/.test(feeRecipient) && !/^0x0{40}$/i.test(feeRecipient)) {
    qs.set('swapFeeToken', params.buyToken);
    qs.set('swapFeeRecipient', feeRecipient);
    qs.set('swapFeeBps', feeBps || '0');
  }

  try {
    const res = await fetch(`${ZEROEX_QUOTE_ENDPOINT}?${qs.toString()}`, {
      headers: { '0x-api-key': apiKey, '0x-version': 'v2' },
    });
    if (!res.ok) return null;
    const json = await res.json();

    const to = json?.transaction?.to;
    const data = json?.transaction?.data;
    const value = json?.transaction?.value;
    const allowanceTarget = json?.issues?.allowance?.spender ?? to;
    const buyAmount = json?.buyAmount;
    const sellAmount = json?.sellAmount;
    const minBuyAmount = json?.minBuyAmount;

    if (
      typeof to !== 'string' ||
      typeof data !== 'string' ||
      typeof allowanceTarget !== 'string' ||
      typeof buyAmount !== 'string' ||
      typeof sellAmount !== 'string'
    ) {
      return null;
    }

    const buy = BigInt(buyAmount);
    const min =
      typeof minBuyAmount === 'string' && minBuyAmount.length > 0
        ? BigInt(minBuyAmount)
        : params.slippageBps !== undefined
          ? (buy * BigInt(10_000 - params.slippageBps)) / 10_000n
          : buy;

    return {
      to: to as `0x${string}`,
      data: data as `0x${string}`,
      value: BigInt(value ?? '0'),
      allowanceTarget: allowanceTarget as `0x${string}`,
      buyAmount: buy,
      sellAmount: BigInt(sellAmount),
      minBuyAmount: min,
    };
  } catch {
    return null;
  }
}
