"use client";

import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";

/** 与 `public/images/lianliankan` 目录下全部 PNG 保持一致（文件名含空格须编码，以免 Image 优化长时间卡住） */
const LIANLIAN_IMAGES = [
  "/images/lianliankan/aardvark%20copy.png",
  "/images/lianliankan/aardvark.png",
  "/images/lianliankan/aardwolf%20copy.png",
  "/images/lianliankan/aardwolf.png",
  "/images/lianliankan/abyssinian.png",
  "/images/lianliankan/addax%20copy.png",
  "/images/lianliankan/addax.png",
  "/images/lianliankan/adelie-penguin.png",
  "/images/lianliankan/afghan-hound.png",
  "/images/lianliankan/african-buffalo.png",
  "/images/lianliankan/african-civet.png",
  "/images/lianliankan/african-crested-porcupine.png",
  "/images/lianliankan/african-crested-rat.png",
  "/images/lianliankan/african-elephant.png",
  "/images/lianliankan/african-grey-parrot.png",
  "/images/lianliankan/african-leopard.png",
  "/images/lianliankan/african-lion.png",
  "/images/lianliankan/african-manatee.png",
  "/images/lianliankan/african-penguin.png",
  "/images/lianliankan/african-spurred-tortoise.png",
  "/images/lianliankan/african-wild-dog.png",
  "/images/lianliankan/airedale-terrier.png",
  "/images/lianliankan/airedale-terrier-1.png",
  "/images/lianliankan/akita.png",
  "/images/lianliankan/cat.png",
  "/images/lianliankan/penguin.png",
] as const;

type Cell = string | null;

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

function pickRandomSrc(): (typeof LIANLIAN_IMAGES)[number] {
  const i = Math.floor(Math.random() * LIANLIAN_IMAGES.length);
  return LIANLIAN_IMAGES[i];
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

/** 每种图案在棋盘上的数量必须为偶数，否则与连连看成对消除规则矛盾 */
function assertBoardImageCountsEven(board: Cell[][]): void {
  const counts = new Map<string, number>();
  for (const row of board) {
    for (const cell of row) {
      if (cell == null) continue;
      counts.set(cell, (counts.get(cell) ?? 0) + 1);
    }
  }
  for (const n of counts.values()) {
    if (n % 2 !== 0) {
      throw new Error("棋盘初始化失败");
    }
  }
}

function createRandomBoard(size: number): Cell[][] {
  const total = size * size;
  if (total % 2 !== 0) {
    throw new Error("棋盘初始化失败");
  }
  const tiles: Cell[] = [];
  for (let k = 0; k < total / 2; k++) {
    const src = pickRandomSrc();
    tiles.push(src, src);
  }
  shuffleInPlace(tiles);
  const board: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < size; r++) {
    board.push(tiles.slice(idx, idx + size));
    idx += size;
  }
  assertBoardImageCountsEven(board);
  return board;
}

type ExpandedPoint = { er: number; ec: number };

function keyOfState(s: {
  r: number;
  c: number;
  lastDir: number;
  turns: number;
}) {
  return JSON.stringify([s.r, s.c, s.lastDir, s.turns]);
}

/** 外围一圈视为空位，转弯不超过 2 次（拐角 ≤2）；返回扩展格路径（含外围转折点） */
function findConnectPath(
  board: Cell[][],
  ar: number,
  ac: number,
  br: number,
  bc: number,
): ExpandedPoint[] | null {
  if (ar === br && ac === bc) return null;
  const v1 = board[ar][ac];
  const v2 = board[br][bc];
  if (v1 == null || v2 == null || v1 !== v2) return null;

  const h = board.length;
  const w = board[0].length;

  const valueAt = (er: number, ec: number): Cell => {
    if (er < 0 || er > h + 1 || ec < 0 || ec > w + 1) return null;
    if (er === 0 || er === h + 1 || ec === 0 || ec === w + 1) return null;
    return board[er - 1][ec - 1];
  };

  const sr = ar + 1;
  const sc = ac + 1;
  const tr = br + 1;
  const tc = bc + 1;

  type St = { r: number; c: number; lastDir: number; turns: number };
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: St[] = [];

  const start: St = { r: sr, c: sc, lastDir: -1, turns: 0 };
  const startKey = keyOfState(start);
  visited.add(startKey);
  parent.set(startKey, null);
  queue.push(start);

  let goalState: St | null = null;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const { r, c, lastDir, turns } = cur;
    if (r === tr && c === tc) {
      goalState = cur;
      break;
    }

    for (let di = 0; di < 4; di++) {
      const [dr, dc] = DIRS[di];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > h + 1 || nc < 0 || nc > w + 1) continue;

      const cell = valueAt(nr, nc);
      const isTarget = nr === tr && nc === tc;
      if (!isTarget && cell !== null) continue;

      let nextTurns = turns;
      if (lastDir !== -1 && lastDir !== di) nextTurns++;
      if (nextTurns > 2) continue;

      const nextKey = keyOfState({
        r: nr,
        c: nc,
        lastDir: di,
        turns: nextTurns,
      });
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      parent.set(nextKey, keyOfState(cur));
      queue.push({ r: nr, c: nc, lastDir: di, turns: nextTurns });
    }
  }

  if (!goalState) return null;

  const keysRev: string[] = [];
  let k: string | null = keyOfState(goalState);
  while (k != null) {
    keysRev.push(k);
    const p = parent.get(k);
    k = p === undefined ? null : p;
  }

  const points: ExpandedPoint[] = [];
  for (let i = keysRev.length - 1; i >= 0; i--) {
    const [r, c] = JSON.parse(keysRev[i]) as [number, number, number, number];
    const prev = points[points.length - 1];
    if (prev && prev.er === r && prev.ec === c) continue;
    points.push({ er: r, ec: c });
  }

  return points;
}

/** 控制台实际打印步骤的完整解法种数 */
const MAX_SOLUTIONS_TO_PRINT = 10;
/** 搜索节点上限：穷尽所有解法成本极高，触顶后已找到的种数有效，但整体可能未穷尽 */
const MAX_CLEAR_SEARCH_NODES = 2_000_000;

type ClearStep = {
  a: { r: number; c: number };
  b: { r: number; c: number };
  image: string;
};

function boardIsEmpty(b: Cell[][]): boolean {
  return b.every((row) => row.every((c) => c === null));
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.slice());
}

function listValidClearMoves(board: Cell[][]): ClearStep[] {
  const h = board.length;
  const w = board[0].length;
  const moves: ClearStep[] = [];
  for (let r1 = 0; r1 < h; r1++) {
    for (let c1 = 0; c1 < w; c1++) {
      const v1 = board[r1][c1];
      if (v1 == null) continue;
      for (let r2 = r1; r2 < h; r2++) {
        const cStart = r2 === r1 ? c1 + 1 : 0;
        for (let c2 = cStart; c2 < w; c2++) {
          const v2 = board[r2][c2];
          if (v2 == null || v2 !== v1) continue;
          if (findConnectPath(board, r1, c1, r2, c2)) {
            moves.push({
              a: { r: r1, c: c1 },
              b: { r: r2, c: c2 },
              image: v1,
            });
          }
        }
      }
    }
  }
  return moves;
}

/** 按与 `listValidClearMoves` 相同顺序找到第一组可消除的相同图案对 */
function findFirstHintMove(board: Cell[][]): ClearStep | null {
  const h = board.length;
  const w = board[0].length;
  for (let r1 = 0; r1 < h; r1++) {
    for (let c1 = 0; c1 < w; c1++) {
      const v1 = board[r1][c1];
      if (v1 == null) continue;
      for (let r2 = r1; r2 < h; r2++) {
        const cStart = r2 === r1 ? c1 + 1 : 0;
        for (let c2 = cStart; c2 < w; c2++) {
          const v2 = board[r2][c2];
          if (v2 == null || v2 !== v1) continue;
          if (findConnectPath(board, r1, c1, r2, c2)) {
            return {
              a: { r: r1, c: c1 },
              b: { r: r2, c: c2 },
              image: v1,
            };
          }
        }
      }
    }
  }
  return null;
}

function boardDedupKey(b: Cell[][]): string {
  const rows: string[] = [];
  for (let r = 0; r < b.length; r++) {
    rows.push(b[r].map((c) => (c === null ? "." : c)).join("\x1f"));
  }
  return rows.join("\x1e");
}

function searchFullClearSolutions(initial: Cell[][]): {
  solutions: ClearStep[][];
  totalCompleteCount: number;
  nodesVisited: number;
  hitNodeLimit: boolean;
} {
  const solutions: ClearStep[][] = [];
  let totalCompleteCount = 0;
  let nodesVisited = 0;
  let hitNodeLimit = false;
  const deadEnds = new Set<string>();

  function dfs(board: Cell[][], path: ClearStep[]): boolean {
    if (nodesVisited >= MAX_CLEAR_SEARCH_NODES) {
      hitNodeLimit = true;
      return false;
    }
    nodesVisited += 1;

    if (boardIsEmpty(board)) {
      totalCompleteCount += 1;
      if (solutions.length < MAX_SOLUTIONS_TO_PRINT) {
        solutions.push(
          path.map((m) => ({
            image: m.image,
            a: { r: m.a.r, c: m.a.c },
            b: { r: m.b.r, c: m.b.c },
          })),
        );
      }
      return true;
    }

    const stateKey = boardDedupKey(board);
    if (deadEnds.has(stateKey)) return false;

    const moves = listValidClearMoves(board);
    if (moves.length === 0) {
      deadEnds.add(stateKey);
      return false;
    }

    let anyComplete = false;
    for (const move of moves) {
      if (nodesVisited >= MAX_CLEAR_SEARCH_NODES) {
        hitNodeLimit = true;
        break;
      }

      const next = cloneBoard(board);
      next[move.a.r][move.a.c] = null;
      next[move.b.r][move.b.c] = null;
      path.push(move);
      const ok = dfs(next, path);
      path.pop();
      if (ok) anyComplete = true;
    }

    if (!anyComplete && !hitNodeLimit) {
      deadEnds.add(stateKey);
    }
    return anyComplete;
  }

  dfs(cloneBoard(initial), []);
  return { solutions, totalCompleteCount, nodesVisited, hitNodeLimit };
}

function imageShortLabel(src: string): string {
  const raw = src.split("/").pop()?.replace(/\.[^.]+$/, "") ?? src;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function logInitialFullClearSolutions(board: Cell[][]) {
  return;
  console.log(
    "%c[连连看]%c 尝试枚举全部「整盘清空」完整解法（受搜索节点上限 %s 约束；完成后仅打印前 %d 种的步骤）…",
    "font-weight:bold;color:#ca8a04",
    "color:inherit",
    MAX_CLEAR_SEARCH_NODES.toLocaleString(),
    MAX_SOLUTIONS_TO_PRINT,
  );
  // return 

  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const { solutions, totalCompleteCount, nodesVisited, hitNodeLimit } =
    searchFullClearSolutions(board);
  const ms =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) -
    t0;

  if (totalCompleteCount === 0) {
    console.log(
      `[连连看] 在限制内未找到可清空棋盘的完整解法（搜索节点 ${nodesVisited.toLocaleString()}，耗时 ${ms.toFixed(0)}ms${hitNodeLimit ? "；已触达节点上限，未必无解" : ""}）。`,
    );
    return;
  }

  const stepsPerGame = solutions[0]?.length ?? 0;
  const exhaustive = !hitNodeLimit;
  console.log(
    `[连连看] 共 ${totalCompleteCount.toLocaleString()} 种完整解法（每种 ${stepsPerGame} 步）${exhaustive ? "（本次已搜尽）" : "（已触达节点上限，总数可能更大）"}；搜索节点 ${nodesVisited.toLocaleString()}，耗时 ${ms.toFixed(0)}ms。`,
  );
  console.log(
    `以下仅展示前 ${Math.min(MAX_SOLUTIONS_TO_PRINT, solutions.length)} 种的逐步操作（1-based 行列与页面一致）：`,
  );

  solutions.forEach((sequence, idx) => {
    console.log(
      `%c第 ${idx + 1} 种%c（${sequence.length} 步）`,
      "font-weight:bold;color:#b45309",
      "color:inherit",
    );
    console.table(
      sequence.map((step, j) => ({
        步: j + 1,
        位置1: `(${step.a.r + 1},${step.a.c + 1})`,
        位置2: `(${step.b.r + 1},${step.b.c + 1})`,
        图案: imageShortLabel(step.image),
      })),
    );
  });
}

/** 扩展格坐标 → 相对棋盘网格左上角的像素点（用真实 cell 中心与间距外推外围点） */
function expandedGridPointToLocalPixel(
  er: number,
  ec: number,
  h: number,
  w: number,
  getCenter: (br: number, bc: number) => { x: number; y: number },
): { x: number; y: number } {
  if (er >= 1 && er <= h && ec >= 1 && ec <= w) {
    return getCenter(er - 1, ec - 1);
  }
  if (er === 0 && ec >= 1 && ec <= w) {
    const p0 = getCenter(0, ec - 1);
    const p1 = getCenter(1, ec - 1);
    return { x: p0.x, y: p0.y - (p1.y - p0.y) };
  }
  if (er === h + 1 && ec >= 1 && ec <= w) {
    const p0 = getCenter(h - 1, ec - 1);
    const p1 = getCenter(h - 2, ec - 1);
    return { x: p0.x, y: p0.y + (p0.y - p1.y) };
  }
  if (ec === 0 && er >= 1 && er <= h) {
    const p0 = getCenter(er - 1, 0);
    const p1 = getCenter(er - 1, 1);
    return { x: p0.x - (p1.x - p0.x), y: p0.y };
  }
  if (ec === w + 1 && er >= 1 && er <= h) {
    const p0 = getCenter(er - 1, w - 1);
    const p1 = getCenter(er - 1, w - 2);
    return { x: p0.x + (p0.x - p1.x), y: p0.y };
  }
  if (er === 0 && ec === 0) {
    const c = getCenter(0, 0);
    const d = getCenter(1, 0);
    const r = getCenter(0, 1);
    return { x: c.x - (r.x - c.x), y: c.y - (d.y - c.y) };
  }
  if (er === 0 && ec === w + 1) {
    const c = getCenter(0, w - 1);
    const d = getCenter(1, w - 1);
    const l = getCenter(0, w - 2);
    return { x: c.x + (c.x - l.x), y: c.y - (d.y - c.y) };
  }
  if (er === h + 1 && ec === 0) {
    const c = getCenter(h - 1, 0);
    const u = getCenter(h - 2, 0);
    const r = getCenter(h - 1, 1);
    return { x: c.x - (r.x - c.x), y: c.y + (c.y - u.y) };
  }
  if (er === h + 1 && ec === w + 1) {
    const c = getCenter(h - 1, w - 1);
    const u = getCenter(h - 2, w - 1);
    const l = getCenter(h - 1, w - 2);
    return { x: c.x + (c.x - l.x), y: c.y + (c.y - u.y) };
  }
  return getCenter(
    Math.min(Math.max(er - 1, 0), h - 1),
    Math.min(Math.max(ec - 1, 0), w - 1),
  );
}

const ELIMINATE_MS = 320;

const ConnectionLine = memo(function ConnectionLine({
  path,
  h,
  w,
  gridRef,
}: {
  path: ExpandedPoint[];
  h: number;
  w: number;
  gridRef: RefObject<HTMLDivElement | null>;
}) {
  const rawId = useId().replace(/:/g, "");
  const gradId = `conn-grad-${rawId}`;
  const glowId = `conn-glow-${rawId}`;

  const [geom, setGeom] = useState<{
    pts: string;
    vw: number;
    vh: number;
    stroke: number;
    blur: number;
  } | null>(null);

  const computeGeom = useCallback(() => {
    const grid = gridRef.current;
    if (!grid || path.length === 0) {
      setGeom(null);
      return;
    }
    const gr = grid.getBoundingClientRect();
    const vw = gr.width;
    const vh = gr.height;
    if (vw < 2 || vh < 2) {
      setGeom(null);
      return;
    }

    const getCenter = (br: number, bc: number) => {
      const idx = br * w + bc;
      const el = grid.children[idx] as HTMLElement | undefined;
      if (!el) {
        return { x: vw / 2, y: vh / 2 };
      }
      const cr = el.getBoundingClientRect();
      return {
        x: cr.left - gr.left + cr.width / 2,
        y: cr.top - gr.top + cr.height / 2,
      };
    };

    const pixels = path.map((p) =>
      expandedGridPointToLocalPixel(p.er, p.ec, h, w, getCenter),
    );
    const pts = pixels
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
    const stroke = Math.max(2.5, Math.min(vw, vh) * 0.018);
    const blur = Math.max(0.8, stroke * 0.38);
    setGeom({ pts, vw, vh, stroke, blur });
  }, [gridRef, path, h, w]);

  useLayoutEffect(() => {
    computeGeom();
    const raf = requestAnimationFrame(computeGeom);
    return () => cancelAnimationFrame(raf);
  }, [computeGeom]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => computeGeom());
    ro.observe(grid);
    return () => ro.disconnect();
  }, [gridRef, computeGeom]);

  if (!geom) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[24] overflow-visible rounded-xl"
      width="100%"
      height="100%"
      viewBox={`0 0 ${geom.vw} ${geom.vh}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#fde68a" stopOpacity="1" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={geom.blur} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polyline
        fill="none"
        filter={`url(#${glowId})`}
        pathLength={100}
        points={geom.pts}
        stroke={`url(#${gradId})`}
        strokeDasharray={100}
        strokeDashoffset={100}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={geom.stroke}
      >
        <animate
          fill="freeze"
          attributeName="stroke-dashoffset"
          dur="0.28s"
          values="100;0"
        />
      </polyline>
      <polyline
        fill="none"
        pathLength={100}
        points={geom.pts}
        stroke="rgba(255,252,240,0.95)"
        strokeDasharray={100}
        strokeDashoffset={100}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={Math.max(1, geom.stroke * 0.34)}
      >
        <animate
          fill="freeze"
          attributeName="stroke-dashoffset"
          dur="0.28s"
          values="100;0"
        />
      </polyline>
    </svg>
  );
});

function altFromSrc(src: string): string {
  const raw = src.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "tile";
  let base = raw;
  try {
    base = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  return `连连看 ${base}`;
}

function cellKey(r: number, c: number) {
  return `${r}-${c}`;
}

const BOARD_SIZE = 8;

const boardGridClassName =
  "grid aspect-square w-full grid-cols-8 gap-0.5 rounded-xl bg-gradient-to-b from-stone-100 via-stone-100/95 to-stone-200/90 p-0.5 shadow-inner ring-1 ring-stone-300/70 sm:gap-1 sm:p-1 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:ring-zinc-700/80";

const skeletonCellClassName =
  "relative min-h-0 overflow-hidden rounded-md animate-pulse bg-stone-200/60 ring-1 ring-stone-200/90 dark:bg-zinc-700/60 dark:ring-zinc-600/60";

const tileBaseClassName =
  "relative m-0 min-h-0 w-full appearance-none overflow-hidden rounded-md border-0 bg-stone-50 p-0 ring-1 ring-stone-200/90 transition-[transform,opacity,box-shadow,ring-color] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:bg-zinc-800 dark:ring-zinc-600/60 dark:focus-visible:outline-amber-400";

const emptyCellClassName =
  "relative min-h-0 rounded-md bg-stone-200/25 ring-1 ring-stone-200/40 dark:bg-zinc-950/40 dark:ring-zinc-700/35";

export default function LianliankanPage() {
  const [board, setBoard] = useState<Cell[][] | null>(null);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(
    null,
  );
  const [vanishing, setVanishing] = useState<Set<string>>(() => new Set());
  const [mismatch, setMismatch] = useState<Set<string>>(() => new Set());
  const [connectPath, setConnectPath] = useState<ExpandedPoint[] | null>(null);
  const [hintMove, setHintMove] = useState<ClearStep | null>(null);
  const [hintNotice, setHintNotice] = useState<string | null>(null);
  const busyRef = useRef(false);
  const boardGridRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const hasRunAfterBoardReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      try {
        const next = createRandomBoard(BOARD_SIZE);
        if (!cancelled) setBoard(next);
      } catch (err) {
        console.error("[连连看] 棋盘初始化失败", err);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (board === null || hasRunAfterBoardReadyRef.current) return;
    hasRunAfterBoardReadyRef.current = true;
    const snapshot = board.map((row) => row.slice());
    const labeled = snapshot.map((row) =>
      row.map((cell) => (cell === null ? null : imageShortLabel(cell))),
    );
    console.log(
      "%c[连连看]%c 棋盘已加载",
      "font-weight:bold;color:#ca8a04",
      "color:inherit",
    );
    console.log("图案简写（行列与页面标注均为 1 起）:", labeled);
    console.log("图片路径:", snapshot);

    const id = window.setTimeout(() => {
      logInitialFullClearSolutions(snapshot);
    }, 0);
    return () => clearTimeout(id);
  }, [board]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      fn();
      timersRef.current = timersRef.current.filter((t) => t !== id);
    }, ms);
    timersRef.current.push(id);
  }, []);

  const handleHintClick = useCallback(() => {
    if (!board || busyRef.current) return;
    const move = findFirstHintMove(board);
    if (!move) {
      setHintMove(null);
      setHintNotice("当前没有可消除的一对（或剩余棋子均无法相连）。");
      schedule(() => setHintNotice(null), 4000);
      return;
    }
    setHintNotice(null);
    setHintMove(move);
  }, [board, schedule]);

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      setHintMove(null);
      setHintNotice(null);

      const b = board;
      if (!b || busyRef.current) return;
      const src = b[r][c];
      if (src == null) return;

      const k = cellKey(r, c);
      if (vanishing.has(k)) return;

      if (!selected) {
        setSelected({ r, c });
        return;
      }

      if (selected.r === r && selected.c === c) {
        setSelected(null);
        return;
      }

      const sr = selected.r;
      const sc = selected.c;
      const firstSrc = b[sr][sc];

      if (firstSrc !== src) {
        setSelected({ r, c });
        return;
      }

      const path = findConnectPath(b, sr, sc, r, c);
      if (!path) {
        const bad = new Set([cellKey(sr, sc), k]);
        setMismatch(bad);
        setSelected(null);
        schedule(() => setMismatch(new Set()), 420);
        return;
      }

      setConnectPath(path);
      const pair = new Set([cellKey(sr, sc), k]);
      setVanishing(pair);
      setSelected(null);
      busyRef.current = true;

      schedule(() => {
        setBoard((prev) => {
          if (!prev) return prev;
          const next = prev.map((row) => row.slice());
          next[sr][sc] = null;
          next[r][c] = null;
          return next;
        });
        setVanishing(new Set());
        setConnectPath(null);
        setHintMove(null);
        busyRef.current = false;
      }, ELIMINATE_MS);
    },
    [board, selected, vanishing, schedule],
  );

  return (
    <div>
      <h2 className="text-xl font-semibold m-0 mb-2">连连看</h2>
      <p className="text-zinc-600 dark:text-zinc-400 m-0 mb-3">
        点击两个相同图案，且能用不超过两次拐弯的线连起（可走棋盘外），即可消除。
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm ring-1 ring-amber-600/30 transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:text-stone-950 dark:ring-amber-500/40 dark:hover:bg-amber-500"
          disabled={board === null}
          onClick={handleHintClick}
        >
          提示
        </button>
        {hintMove ? (
          <p className="m-0 text-sm text-emerald-800 dark:text-emerald-300" role="status">
            可消除「{imageShortLabel(hintMove.image)}」：第 {hintMove.a.r + 1} 行第{" "}
            {hintMove.a.c + 1} 列 与 第 {hintMove.b.r + 1} 行第 {hintMove.b.c + 1}{" "}
            列（已在棋盘上高亮）
          </p>
        ) : null}
        {hintNotice ? (
          <p className="m-0 text-sm text-zinc-600 dark:text-zinc-400" role="status">
            {hintNotice}
          </p>
        ) : null}
      </div>
      <div className="relative w-full max-w-[min(100%,28rem)]">
        <div
          ref={boardGridRef}
          className={boardGridClassName}
          role="grid"
          aria-label="连连看棋盘"
          aria-busy={board === null}
        >
          {board === null
            ? Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => (
                <div
                  key={i}
                  className={skeletonCellClassName}
                  role="gridcell"
                  aria-hidden
                />
              ))
            : board.map((row, rowIndex) =>
                row.map((src, colIndex) => {
                  const k = cellKey(rowIndex, colIndex);
                  const isSelected =
                    selected?.r === rowIndex && selected?.c === colIndex;
                  const isVanish = vanishing.has(k);
                  const isBad = mismatch.has(k);
                  const isHintTile =
                    hintMove != null &&
                    ((hintMove.a.r === rowIndex && hintMove.a.c === colIndex) ||
                      (hintMove.b.r === rowIndex &&
                        hintMove.b.c === colIndex));

                  if (src == null) {
                    return (
                      <div
                        key={k}
                        className={emptyCellClassName}
                        role="gridcell"
                        aria-label={`空位 ${rowIndex + 1},${colIndex + 1}`}
                      />
                    );
                  }

                  return (
                    <button
                      key={k}
                      type="button"
                      className={`${tileBaseClassName} cursor-pointer active:scale-95 disabled:pointer-events-none ${
                        isSelected
                          ? "z-10 scale-[1.04] shadow-md ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-100 dark:ring-amber-300 dark:ring-offset-zinc-900"
                          : ""
                      } ${
                        isVanish
                          ? "pointer-events-none z-20 scale-90 opacity-0 blur-[0.5px]"
                          : ""
                      } ${
                        isBad
                          ? "ring-2 ring-rose-400 ring-offset-1 ring-offset-stone-100 dark:ring-rose-400 dark:ring-offset-zinc-900"
                          : ""
                      } ${
                        isHintTile
                          ? "z-[12] ring-2 ring-emerald-500 ring-offset-2 ring-offset-stone-100 shadow-md dark:ring-emerald-400 dark:ring-offset-zinc-900"
                          : ""
                      }`}
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-label={`图案 ${altFromSrc(src)}，第 ${rowIndex + 1} 行第 ${colIndex + 1} 列`}
                      onClick={() => handleTileClick(rowIndex, colIndex)}
                    >
                      <Image
                        src={src}
                        alt={altFromSrc(src)}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 640px) 11vw, 3.5rem"
                      />
                    </button>
                  );
                }),
              )}
        </div>
        {connectPath && board ? (
          <ConnectionLine
            path={connectPath}
            h={board.length}
            w={board[0].length}
            gridRef={boardGridRef}
          />
        ) : null}
      </div>
    </div>
  );
}
