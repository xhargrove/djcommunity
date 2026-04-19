/** Public profile URL for a handle (handle is already normalized in DB). */
export function profilePublicPath(handle: string): string {
  return `/u/${encodeURIComponent(handle)}`;
}
