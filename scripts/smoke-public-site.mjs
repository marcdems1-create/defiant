#!/usr/bin/env node

/**
 * Production smoke for Transak KYB + deploys.
 * Fails if the live site 404s legal pages or serves a wallet-chunk error
 * as the homepage — that is what got the last KYB filing rejected.
 */

const DEFAULT_APEX_URL = 'https://openhand.online';
const DEFAULT_WWW_URL = 'https://www.openhand.online/';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;

const KYB_PATHS = [
  '/terms',
  '/privacy',
  '/about',
  '/contact',
  '/partners',
  '/buy-usdc',
  '/refunds',
  '/support',
  '/risk',
];

async function main() {
  const apexUrl = new URL(process.env.OPENHAND_SMOKE_APEX_URL ?? DEFAULT_APEX_URL);
  const wwwUrl = new URL(process.env.OPENHAND_SMOKE_WWW_URL ?? DEFAULT_WWW_URL);
  const failures = [];

  const apexRes = await fetchWithRetries(apexUrl.toString(), { redirect: 'manual' });
  const location = apexRes.headers.get('location') ?? '';
  const isRedirect = [301, 302, 307, 308].includes(apexRes.status);
  const expectedRedirectTarget = wwwUrl.origin;
  if (!isRedirect || !location.startsWith(expectedRedirectTarget)) {
    failures.push(
      `Expected ${apexUrl.origin} to redirect to ${expectedRedirectTarget}, got status=${apexRes.status} location=${location || '<none>'}`,
    );
  }

  const pageRes = await fetchWithRetries(wwwUrl.toString(), { redirect: 'follow' });
  if (pageRes.status !== 200) {
    failures.push(`Expected ${wwwUrl.toString()} to return 200, got ${pageRes.status}`);
  }

  const html = await pageRes.text();
  if (!html.includes('<title>Openhand')) {
    failures.push('Homepage response is missing the expected Openhand title.');
  }
  if (/Openhand could not load/i.test(html) && !html.includes('Yield')) {
    failures.push('Homepage HTML looks like the error boundary, not the product.');
  }
  if (!html.includes('/terms') || !html.includes('/privacy')) {
    failures.push('Homepage HTML is missing Terms/Privacy footer links (needed before JS).');
  }
  if (!/Transak/i.test(html)) {
    failures.push('Homepage HTML does not name Transak for CAD/USDC checkout.');
  }

  const staticAssets = extractStaticAssets(html, wwwUrl.origin);
  if (staticAssets.length === 0) {
    failures.push('No Next.js static assets were detected in homepage HTML.');
  }

  for (const assetUrl of staticAssets) {
    const assetRes = await fetchWithRetries(assetUrl, { redirect: 'follow' });
    if (assetRes.status !== 200) {
      failures.push(`Static asset is unavailable: ${assetUrl} (status=${assetRes.status})`);
    }
  }

  const manifestUrl = new URL('/manifest.webmanifest', wwwUrl.origin).toString();
  const manifestRes = await fetchWithRetries(manifestUrl, { redirect: 'follow' });
  if (manifestRes.status !== 200) {
    failures.push(`Manifest check failed: ${manifestUrl} (status=${manifestRes.status})`);
  }

  for (const path of KYB_PATHS) {
    const url = new URL(path, wwwUrl.origin).toString();
    const res = await fetchWithRetries(url, { redirect: 'follow' });
    const body = await res.text();
    if (res.status !== 200) {
      failures.push(`KYB page ${path} returned ${res.status}`);
      continue;
    }
    if (path === '/terms' && !body.includes('https://transak.com/terms-of-service')) {
      failures.push('/terms does not include Transak Terms of Service.');
    }
    if (path === '/terms' && !/merchant of record/i.test(body)) {
      failures.push('/terms does not name Transak as merchant of record.');
    }
    if (path === '/privacy' && !body.includes('https://transak.com/privacy-policy')) {
      failures.push('/privacy does not include Transak Privacy Policy.');
    }
    if (path === '/privacy' && !body.includes('hello@openhand.online')) {
      failures.push('/privacy is missing the corporate contact email.');
    }
    if (path === '/about' && !body.includes('hello@openhand.online')) {
      failures.push('/about is missing the corporate contact email.');
    }
    if (path === '/contact' && !body.includes('hello@openhand.online')) {
      failures.push('/contact is missing the corporate contact email.');
    }
    if (path === '/refunds' && !/Transak/i.test(body)) {
      failures.push('/refunds does not name Transak as the refund handler.');
    }
    if (/HYPERFLEX|openhand\.money/i.test(body)) {
      failures.push(`${path} still contains reverted KYB identity (HYPERFLEX / openhand.money).`);
    }
  }

  const tosRes = await fetchWithRetries(new URL('/tos', wwwUrl.origin).toString(), {
    redirect: 'manual',
  });
  if (![301, 308].includes(tosRes.status) || !(tosRes.headers.get('location') ?? '').includes('/terms')) {
    failures.push(`Expected /tos → /terms, got ${tosRes.status} ${tosRes.headers.get('location')}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exit(1);
  }

  console.log('Smoke check passed.');
  console.log(`- Apex redirect: ${apexRes.status} ${location}`);
  console.log(`- Homepage status: ${pageRes.status}`);
  console.log(`- Static assets checked: ${staticAssets.length}`);
  console.log(`- Manifest status: ${manifestRes.status}`);
  console.log(`- KYB pages: ${KYB_PATHS.join(', ')}`);
}

function extractStaticAssets(html, origin) {
  const urls = new Set();
  const attrRegex = /<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi;
  let match;

  while ((match = attrRegex.exec(html))) {
    const rawUrl = match[1];
    if (!rawUrl.includes('/_next/static/')) continue;
    urls.add(new URL(rawUrl, origin).toString());
  }

  return [...urls];
}

async function fetchWithRetries(url, options) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      await sleep(attempt * 1000);
    }
  }

  throw new Error(`Request failed for ${url}: ${lastError?.message ?? 'Unknown error'}`);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();
