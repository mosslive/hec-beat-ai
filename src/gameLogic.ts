import type { BoardRow, GameState, GameStats, LastComputerMove } from './types';

export const TOTAL_PINS = 10;
const STORAGE_KEY_TOTAL = 'beatAI_totalStats';
const STORAGE_KEY_BOARD = 'beatAI_board';

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export function loadTotalStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOTAL);
    if (raw) return JSON.parse(raw) as GameStats;
  } catch {
    /* ignore */
  }
  return { userWins: 0, computerWins: 0 };
}

export function saveTotalStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY_TOTAL, JSON.stringify(stats));
}

export function loadBoard(): BoardRow[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOARD);
    if (raw) return JSON.parse(raw) as BoardRow[];
  } catch {
    /* ignore */
  }
  return null;
}

export function saveBoard(board: BoardRow[]): void {
  localStorage.setItem(STORAGE_KEY_BOARD, JSON.stringify(board));
}

export function clearBoard(): void {
  localStorage.removeItem(STORAGE_KEY_BOARD);
}

// ---------------------------------------------------------------------------
// Board / pin helpers
// ---------------------------------------------------------------------------

export function createFreshBoard(): BoardRow[] {
  return Array.from({ length: TOTAL_PINS }, () => ({ availableMoves: [1, 2, 3] }));
}

/** Returns the 1-indexed number of the lowest pin still on the board, or null if board is empty */
export function getFirstAvailablePin(pinsAvailable: boolean[]): number | null {
  for (let i = 0; i < TOTAL_PINS; i++) {
    if (pinsAvailable[i]) return i + 1;
  }
  return null;
}

export function getRemainingCount(pinsAvailable: boolean[]): number {
  return pinsAvailable.filter(Boolean).length;
}

/**
 * Mark the first `count` available pins as taken.
 * Returns a new array without mutating the original.
 */
export function takePins(pinsAvailable: boolean[], count: number): boolean[] {
  const next = [...pinsAvailable];
  let taken = 0;
  for (let i = 0; i < TOTAL_PINS && taken < count; i++) {
    if (next[i]) {
      next[i] = false;
      taken++;
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// AI logic
// ---------------------------------------------------------------------------

/**
 * Returns the moves the computer is allowed to make given the current board state.
 * Moves are filtered by both the sticky-note availability and the remaining pin count.
 */
export function getValidComputerMoves(pinsAvailable: boolean[], board: BoardRow[]): number[] {
  const firstPin = getFirstAvailablePin(pinsAvailable);
  if (firstPin === null) return [];
  const remaining = getRemainingCount(pinsAvailable);
  return board[firstPin - 1].availableMoves.filter((m) => m <= remaining);
}

/**
 * Choose a random valid move for the computer.
 * Falls back to 1 (or the minimum remaining count) if the sticky notes leave no valid options.
 */
export function chooseComputerMove(pinsAvailable: boolean[], board: BoardRow[]): number {
  const valid = getValidComputerMoves(pinsAvailable, board);
  if (valid.length > 0) {
    return valid[Math.floor(Math.random() * valid.length)];
  }
  // Fallback: pick 1 (forced, regardless of sticky notes)
  return Math.min(1, getRemainingCount(pinsAvailable));
}

/**
 * Remove a move option from the board row for the given pin position.
 * Returns a new board array without mutating the original.
 */
export function removeMove(board: BoardRow[], startPin: number, count: number): BoardRow[] {
  return board.map((row, idx) => {
    if (idx === startPin - 1) {
      return { availableMoves: row.availableMoves.filter((m) => m !== count) };
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createInitialState(
  board: BoardRow[],
  sessionStats: GameStats,
  totalStats: GameStats,
): GameState {
  return {
    pinsAvailable: Array(TOTAL_PINS).fill(true),
    board,
    currentPlayer: 'user',
    gameOver: false,
    loser: null,
    lastComputerMove: null,
    sessionStats,
    totalStats,
    message: 'Your turn! Pick 1, 2, or 3 pins.',
  };
}

// ---------------------------------------------------------------------------
// Turn reducers
// ---------------------------------------------------------------------------

/**
 * Apply the user's move.  Returns the next GameState (computer's turn or game-over).
 */
export function applyUserMove(state: GameState, count: number): GameState {
  const newPins = takePins(state.pinsAvailable, count);
  const remaining = getRemainingCount(newPins);

  if (remaining === 0) {
    // User took the last pin → user loses
    const newSession = { ...state.sessionStats, computerWins: state.sessionStats.computerWins + 1 };
    const newTotal = { ...state.totalStats, computerWins: state.totalStats.computerWins + 1 };
    saveTotalStats(newTotal);
    return {
      ...state,
      pinsAvailable: newPins,
      currentPlayer: 'computer',
      gameOver: true,
      loser: 'user',
      sessionStats: newSession,
      totalStats: newTotal,
      message: 'You picked the last pin — the AI wins! 🤖',
    };
  }

  return {
    ...state,
    pinsAvailable: newPins,
    currentPlayer: 'computer',
    message: 'AI is thinking...',
  };
}

/**
 * Apply the computer's move.  Returns the next GameState (user's turn or game-over).
 * Also applies the learning step when the computer loses.
 */
export function applyComputerMove(state: GameState): GameState {
  const count = chooseComputerMove(state.pinsAvailable, state.board);
  const firstPin = getFirstAvailablePin(state.pinsAvailable)!;
  const lastMove: LastComputerMove = { startPin: firstPin, count };

  const newPins = takePins(state.pinsAvailable, count);
  const remaining = getRemainingCount(newPins);

  if (remaining === 0) {
    // Computer took the last pin → computer loses → apply learning
    const newBoard = removeMove(state.board, lastMove.startPin, lastMove.count);
    saveBoard(newBoard);

    const newSession = { ...state.sessionStats, userWins: state.sessionStats.userWins + 1 };
    const newTotal = { ...state.totalStats, userWins: state.totalStats.userWins + 1 };
    saveTotalStats(newTotal);

    return {
      ...state,
      pinsAvailable: newPins,
      board: newBoard,
      currentPlayer: 'user',
      gameOver: true,
      loser: 'computer',
      lastComputerMove: lastMove,
      sessionStats: newSession,
      totalStats: newTotal,
      message: `AI picked ${count} pin${count > 1 ? 's' : ''} and got the last pin — You win! 🎉 AI removed option "${count}" from position ${lastMove.startPin}.`,
    };
  }

  return {
    ...state,
    pinsAvailable: newPins,
    currentPlayer: 'user',
    lastComputerMove: lastMove,
    message: `AI picked ${count} pin${count > 1 ? 's' : ''}. Your turn!`,
  };
}
