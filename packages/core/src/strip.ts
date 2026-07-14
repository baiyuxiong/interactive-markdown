/**
 * Drop a trailing unclosed `:::` directive so streaming UIs never flash half widgets.
 * Also drops trailing bare `:` / `::` / `:::` prefixes while a fence is still forming.
 * Complete documents are returned unchanged.
 */
export function stripIncomplete(source: string): string {
  const lines = source.split("\n");
  let openAt: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isCloseFence(line)) {
      if (openAt !== null) {
        openAt = null;
      } else {
        // Bare ::: with nothing open yet — treat as incomplete open (streaming).
        openAt = i;
      }
      continue;
    }
    if (isOpenFence(line) || isIncompleteColonPrefix(line)) {
      openAt = i;
    }
  }

  if (openAt === null) return source;

  const kept = lines.slice(0, openAt);
  if (kept.length === 0) return "";
  return kept.join("\n") + (source.endsWith("\n") || kept.length > 0 ? "\n" : "");
}

function isIncompleteColonPrefix(line: string): boolean {
  const t = line.trimEnd();
  return t === ":" || t === "::";
}

function isOpenFence(line: string): boolean {
  return /^:::[a-zA-Z][\w-]*/.test(line.trimEnd());
}

function isCloseFence(line: string): boolean {
  return /^:::\s*$/.test(line);
}
