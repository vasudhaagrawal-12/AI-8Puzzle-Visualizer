/* Board utilities for the 3×3 sliding puzzle. */
(function (root) {
  'use strict';
  const SIZE = 3;
  function key(board) { return board.join(''); }
  function validate(board) {
    if (!Array.isArray(board) || board.length !== 9) return 'Enter exactly 9 tiles.';
    if (board.some((v) => !Number.isInteger(v) || v < 0 || v > 8)) return 'Tiles must be integers from 0 to 8.';
    const counts = Array(9).fill(0); board.forEach((v) => counts[v]++);
    if (counts.some((count) => count !== 1)) return 'Use each tile 1–8 and the blank (0) exactly once.';
    return null;
  }
  function successors(board) {
    const blank = board.indexOf(0), row = Math.floor(blank / SIZE), col = blank % SIZE;
    const candidates = [row > 0 ? blank - SIZE : -1, col < SIZE - 1 ? blank + 1 : -1, row < SIZE - 1 ? blank + SIZE : -1, col > 0 ? blank - 1 : -1];
    return candidates.filter((i) => i >= 0).map((i) => {
      const next = board.slice(); next[blank] = next[i]; next[i] = 0;
      const direction = i === blank - SIZE ? 'up' : i === blank + 1 ? 'right' : i === blank + SIZE ? 'down' : 'left';
      return { board: next, direction, movedTile: board[i] };
    });
  }
  function inversionParity(board, goal) {
    const rank = new Map(goal.filter((v) => v !== 0).map((v, i) => [v, i]));
    const sequence = board.filter((v) => v !== 0).map((v) => rank.get(v)); let inversions = 0;
    for (let i = 0; i < sequence.length; i++) for (let j = i + 1; j < sequence.length; j++) if (sequence[i] > sequence[j]) inversions++;
    return inversions % 2;
  }
  function isReachable(start, goal) { return inversionParity(start, goal) === inversionParity(goal, goal); }
  function randomSolvable(goal, moves) {
    const error = validate(goal);
    if (error) throw new TypeError(`Cannot generate a puzzle from an invalid goal: ${error}`);
    let board = goal.slice(), previous = -1;
    const stepCount = moves === undefined ? 26 : Math.max(0, Math.floor(moves));
    for (let i = 0; i < stepCount; i++) {
      let options = successors(board).filter((s) => s.board.indexOf(0) !== previous);
      if (!options.length) options = successors(board);
      const next = options[Math.floor(Math.random() * options.length)]; previous = board.indexOf(0); board = next.board;
    }
    return board;
  }
  const api = { SIZE, key, validate, successors, inversionParity, isReachable, randomSolvable };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Puzzle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
