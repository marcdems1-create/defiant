/** Stale Next/Vercel deploys 404 hashed CSS/JS. Transak rejected a non-functional site. */
export const CHUNK_LOAD_ERROR_RE =
  /chunkloaderror|loading (css )?chunk \d+ failed|failed to fetch dynamically imported module/i;

export const CHUNK_RELOAD_KEY = 'oh.chunk-reload-attempted';

export function isChunkLoadError(message: string): boolean {
  return CHUNK_LOAD_ERROR_RE.test(message);
}

/** One hard reload per tab. Returns true if a reload was triggered. */
export function reloadOnceForStaleChunk(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return false;
  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
  return true;
}
