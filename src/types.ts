export type Player = 'user' | 'computer';

export interface BoardRow {
  /** Which counts (1, 2, 3) the AI is still allowed to pick from this pin position */
  availableMoves: number[];
}

export interface GameStats {
  userWins: number;
  computerWins: number;
}

export interface LastComputerMove {
  /** The pin number (1-indexed) that was "first available" when the computer moved */
  startPin: number;
  /** How many pins the computer picked */
  count: number;
}

export interface GameState {
  /** Index i → pin number (i+1); true = still on the board */
  pinsAvailable: boolean[];
  /** board[i] holds the AI learning state for when pin (i+1) is the first available */
  board: BoardRow[];
  currentPlayer: Player;
  gameOver: boolean;
  loser: Player | null;
  lastComputerMove: LastComputerMove | null;
  /** Resets when the Reset button is pressed */
  sessionStats: GameStats;
  /** Never resets */
  totalStats: GameStats;
  message: string;
}
