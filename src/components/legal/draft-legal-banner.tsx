/** Visible on placeholder legal pages so operators cannot mistake them for final copy. */
export function DraftLegalBanner() {
  return (
    <div
      className="mb-6 rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-800"
      role="note"
    >
      Draft — not final legal text. Not legal advice. Replace before public launch.
    </div>
  );
}
