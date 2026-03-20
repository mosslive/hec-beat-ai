# hec-beat-ai — Schlag die KI (Beat the AI)

A web-based Nim game built with React + TypeScript + Vite.

## Rules

- The board has **10 pins** numbered 1–10.
- Players alternate turns. Each turn a player picks **1, 2, or 3** consecutive pins, starting from the lowest available.
- The player who picks the **last pin loses**.
- The human goes first.

## AI Learning

The AI uses the sticky notes next to each pin to decide how many pins to take when that pin is the first available.
Each note (1, 2 or 3) represents an allowed move from that position.

**When the AI loses**, it removes the move option it last chose from the position it started from. Over many rounds
the AI learns which moves to avoid from each position.

## Statistics

- **This Session** – resets when the Reset button is pressed.
- **All Time** – stored in `localStorage`; never resets.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # run ESLint
```
