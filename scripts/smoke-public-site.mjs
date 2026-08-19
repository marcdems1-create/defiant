#!/usr/bin/env node

const DEFAULT_APEX_URL = 'https://openhand.online';
const DEFAULT_WWW_URL = 'https://www.openhand.online/';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;

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
