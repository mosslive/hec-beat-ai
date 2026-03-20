import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import {
  applyComputerMove,
  applyUserMove,
  clearBoard,
  createFreshBoard,
  createInitialState,
  getFirstAvailablePin,
  getRemainingCount,
  getValidComputerMoves,
  loadBoard,
  loadTotalStats,
  TOTAL_PINS,
} from './gameLogic';
import type { GameState } from './types';

// ---------------------------------------------------------------------------
// Helper to build a fresh game while keeping persistent state
// ---------------------------------------------------------------------------
function newGame(prevState?: GameState): GameState {
  const board = prevState?.board ?? loadBoard() ?? createFreshBoard();
  const sessionStats = prevState?.sessionStats ?? { userWins: 0, computerWins: 0 };
  const totalStats = loadTotalStats();
  return createInitialState(board, sessionStats, totalStats);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [state, setState] = useState<GameState>(() => newGame());
  const computerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger the computer's move after a short delay whenever it's the computer's turn
  useEffect(() => {
    if (!state.gameOver && state.currentPlayer === 'computer') {
      computerTimerRef.current = setTimeout(() => {
        setState((prev) => applyComputerMove(prev));
      }, 1200);
    }
    return () => {
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    };
  }, [state.gameOver, state.currentPlayer]);

  const handleUserPick = useCallback(
    (count: number) => {
      if (state.gameOver || state.currentPlayer !== 'user') return;
      const remaining = getRemainingCount(state.pinsAvailable);
      if (count > remaining) return;
      setState((prev) => applyUserMove(prev, count));
    },
    [state.gameOver, state.currentPlayer, state.pinsAvailable],
  );

  const handleNextRound = useCallback(() => {
    setState((prev) => newGame(prev));
  }, []);

  const handleReset = useCallback(() => {
    clearBoard();
    setState(() => {
      const totalStats = loadTotalStats();
      return createInitialState(createFreshBoard(), { userWins: 0, computerWins: 0 }, totalStats);
    });
  }, []);

  // Derived values
  const remaining = getRemainingCount(state.pinsAvailable);
  const firstPin = getFirstAvailablePin(state.pinsAvailable);
  const validComputerMoves = firstPin
    ? getValidComputerMoves(state.pinsAvailable, state.board)
    : [];

  return (
    <div className="app">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="app-header">
        <h1 className="app-title">
          Schlag die <span className="app-title-ki">KI</span>
        </h1>
        <p className="app-subtitle">Beat the AI · Nim Game</p>
      </header>

      <main className="app-main">
        {/* ---------------------------------------------------------------- */}
        {/* Board                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="board" aria-label="Game board">
          {Array.from({ length: TOTAL_PINS }, (_, i) => {
            const pinNumber = TOTAL_PINS - i; // display top → bottom: 10, 9, 8…1
            const pinIdx = pinNumber - 1;
            const isAvailable = state.pinsAvailable[pinIdx];
            const isFirst = pinNumber === firstPin;
            const boardRow = state.board[pinIdx];

            return (
              <div
                key={pinNumber}
                className={[
                  'board-row',
                  !isAvailable ? 'board-row--taken' : '',
                  isFirst ? 'board-row--active' : '',
                ].join(' ')}
                aria-label={`Pin ${pinNumber}${!isAvailable ? ' (taken)' : isFirst ? ' (next to pick)' : ''}`}
              >
                {/* Pin number */}
                <span className="pin-number">{pinNumber}</span>

                {/* Sticky notes: 1, 2, 3 */}
                <div className="sticky-notes">
                  {[1, 2, 3].map((n) => {
                    const present = boardRow.availableMoves.includes(n);
                    return (
                      <div
                        key={n}
                        className={['sticky', present ? 'sticky--present' : 'sticky--removed'].join(
                          ' ',
                        )}
                        aria-label={present ? `Move ${n} available` : `Move ${n} removed`}
                      >
                        {present ? n : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Pin peg visual */}
                <div className={['pin-peg', !isAvailable ? 'pin-peg--taken' : ''].join(' ')} />
              </div>
            );
          })}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Control panel                                                    */}
        {/* ---------------------------------------------------------------- */}
        <aside className="panel">
          {/* Status message */}
          <div
            className={[
              'message',
              state.gameOver && state.loser === 'computer' ? 'message--win' : '',
              state.gameOver && state.loser === 'user' ? 'message--lose' : '',
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            {state.message}
          </div>

          {/* Remaining count */}
          <div className="remaining">
            {remaining} pin{remaining !== 1 ? 's' : ''} remaining
          </div>

          {/* AI move hint */}
          {!state.gameOver && firstPin && state.currentPlayer === 'user' && (
            <div className="ai-hint">
              AI options at pin {firstPin}:{' '}
              {validComputerMoves.length > 0
                ? validComputerMoves.join(', ')
                : '(no options — will default to 1)'}
            </div>
          )}

          {/* User action buttons */}
          {!state.gameOver && state.currentPlayer === 'user' && (
            <div className="pick-buttons" aria-label="Pick pins">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className="btn btn--pick"
                  onClick={() => handleUserPick(n)}
                  disabled={n > remaining}
                  aria-label={`Pick ${n} pin${n > 1 ? 's' : ''}`}
                >
                  Take {n}
                </button>
              ))}
            </div>
          )}

          {/* Computer thinking indicator */}
          {!state.gameOver && state.currentPlayer === 'computer' && (
            <div className="thinking" aria-live="polite">
              <span className="thinking-dots">AI is thinking</span>
            </div>
          )}

          {/* After game-over: next round button */}
          {state.gameOver && (
            <button className="btn btn--next" onClick={handleNextRound}>
              Next Round
            </button>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Statistics                                                       */}
          {/* ---------------------------------------------------------------- */}
          <section className="stats" aria-label="Statistics">
            <h2 className="stats-title">Statistics</h2>
            <div className="stats-grid">
              <div className="stats-section">
                <h3 className="stats-section-title">This Session</h3>
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>You</td>
                      <td>{state.sessionStats.userWins}</td>
                    </tr>
                    <tr>
                      <td>AI</td>
                      <td>{state.sessionStats.computerWins}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="stats-section">
                <h3 className="stats-section-title">All Time</h3>
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>You</td>
                      <td>{state.totalStats.userWins}</td>
                    </tr>
                    <tr>
                      <td>AI</td>
                      <td>{state.totalStats.computerWins}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Reset button */}
          <button className="btn btn--reset" onClick={handleReset}>
            Reset Game &amp; Restore All Notes
          </button>

          {/* Legend */}
          <div className="legend">
            <span className="legend-item">
              <span className="sticky sticky--present sticky--small">1</span> Available move
            </span>
            <span className="legend-item">
              <span className="sticky sticky--removed sticky--small" />
              Removed by AI learning
            </span>
          </div>
        </aside>
      </main>
    </div>
  );
}
