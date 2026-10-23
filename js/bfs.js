/* Manual breadth-first graph search. States are marked visited on enqueue. */
(function (root) {
  'use strict';
  const MAX_RECORDED_EVENTS = 6000;
  function solve(start, goal, options) {
    const started = performance.now();
    const invalidStart = Puzzle.validate(start), invalidGoal = Puzzle.validate(goal);
    if (invalidStart || invalidGoal) return emptyResult(started, `Invalid ${invalidStart ? 'initial' : 'goal'} board: ${invalidStart || invalidGoal}`);
    if (!Puzzle.isReachable(start, goal)) return emptyResult(started, 'The initial and goal boards are not mutually reachable.');
    const startKey = Puzzle.key(start), goalKey = Puzzle.key(goal);
    const queue = [startKey], boards = new Map([[startKey, start.slice()]]), parent = new Map([[startKey, null]]);
    const via = new Map(), depth = new Map([[startKey, 0]]), discovered = new Set([startKey]);
    const expanded = new Set(), events = [], retain = !options || options.recordEvents !== false;
    let head = 0, maximumDepth = 0, generated = 1, foundKey = null;
    while (head < queue.length) {
      const currentKey = queue[head++], current = boards.get(currentKey), currentDepth = depth.get(currentKey);
      expanded.add(currentKey);
      // A goal state is dequeued (and therefore counted as expanded), but does not generate successors.
      if (currentKey === goalKey) {
        if (retain && events.length < MAX_RECORDED_EVENTS) events.push(makeEvent(currentKey, [], queue, head, expanded, currentDepth, parent, goalKey));
        foundKey = currentKey;
        break;
      }
      const children = [];
      for (const next of Puzzle.successors(current)) {
        const nextKey = Puzzle.key(next.board);
        if (discovered.has(nextKey)) continue;
        discovered.add(nextKey); generated++; boards.set(nextKey, next.board); parent.set(nextKey, currentKey);
        via.set(nextKey, { direction: next.direction, movedTile: next.movedTile });
        depth.set(nextKey, currentDepth + 1); maximumDepth = Math.max(maximumDepth, currentDepth + 1);
        queue.push(nextKey); children.push(nextKey);
      }
      if (retain && events.length < MAX_RECORDED_EVENTS) events.push(makeEvent(currentKey, children, queue, head, expanded, currentDepth, parent, goalKey));
    }
    const elapsedMs = performance.now() - started;
    const path = [];
    if (foundKey) {
      let cursor = foundKey;
      while (cursor !== null) { path.push({ key: cursor, board: boards.get(cursor).slice(), depth: depth.get(cursor), move: via.get(cursor) || null }); cursor = parent.get(cursor); }
      path.reverse();
    }
    // Rough JS object-storage model: key, board, queue reference, and visited/parent/depth records.
    // This is an estimate, not a measurement of browser or worker heap usage.
    const estimatedBytes = generated * (18 + 72 + 8 + 32 + 64 + 48);
    return { found: !!foundKey, path, events, recordedEventLimit: MAX_RECORDED_EVENTS, eventsTruncated: retain && expanded.size > events.length, generated, expanded: expanded.size, maximumDepth, elapsedMs, estimatedBytes, queueLength: queue.length, discoveredCount: discovered.size, error: null };
  }
  function makeEvent(currentKey, children, queue, head, expanded, currentDepth, parent, goalKey) {
    return { currentKey, childKeys: children, frontierKeys: queue.slice(head, head + 12), frontierCount: queue.length - head, exploredKeys: Array.from(expanded).slice(-12), exploredCount: expanded.size, depth: currentDepth, pathCost: currentDepth, parentKey: parent.get(currentKey), complete: currentKey === goalKey };
  }
  function emptyResult(started, error) {
    return { found: false, path: [], events: [], recordedEventLimit: MAX_RECORDED_EVENTS, eventsTruncated: false, generated: 0, expanded: 0, maximumDepth: 0, elapsedMs: performance.now() - started, estimatedBytes: 0, queueLength: 0, discoveredCount: 0, error };
  }
  const api = { solve, MAX_RECORDED_EVENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BFS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
