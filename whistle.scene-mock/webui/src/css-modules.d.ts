/** CSS entry (side-effect imports). Prefer relative imports so `*.css` matches reliably under TS2882 + path aliases. */
declare module '*.css' {}

/** If you must use `@/globals.css`, the alias specifier needs its own ambient module. */
declare module '@/globals.css' {}
