/**
 * Content Script entry — framework only, no business logic yet.
 *
 * Plasmo treats contents/*.tsx as Content Script UI and requires a default export.
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

export default function Content() {
  return null
}
