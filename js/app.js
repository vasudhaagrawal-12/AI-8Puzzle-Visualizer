/* DOM integration: board editing, BFS results, and recorded event playback. */
(function () {
  'use strict';
  const DEFAULT = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let start = [1, 2, 3, 4, 5, 6, 0, 7, 8], goal = DEFAULT.slice();
  let playback = null, activeWorker = null;
  const $ = (id) => document.getElementById(id);
  const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  function renderBoard(id, board, editable, goalBoard) {
    const host = $(id); host.replaceChildren(); host.classList.toggle('goal-board', !!goalBoard);
    board.forEach((value, index) => {
      const button = node('button', `puzzle-tile${value === 0 ? ' blank-tile' : ''}`, value === 0 ? '·' : String(value));
      button.type = 'button'; button.setAttribute('aria-label', `Cell ${index + 1}: ${value === 0 ? 'blank' : `tile ${value}`}`);
      if (editable) button.addEventListener('click', () => editTile(editable, index)); else button.tabIndex = -1;
      host.append(button);
    });
  }
  function editTile(which, index) {
    const board = (which === 'start' ? start : goal).slice();
    // Cycle this cell through 0–8, swapping the displaced value to keep a permutation.
    const old = board[index], replacement = (old + 1) % 9, other = board.indexOf(replacement);
    board[index] = replacement; board[other] = old;
    if (which === 'start') start = board; else goal = board;
    renderBoards(); invalidateRun(); setMessage('Board updated. Run validation before searching.', '');
  }
  function renderBoards() { renderBoard('startBoard', start, 'start', false); renderBoard('goalBoard', goal, 'goal', true); }
  function setMessage(message, kind) { const el = $('validation'); el.textContent = message; el.className = `validation${kind ? ` ${kind}` : ''}`; }
  function validateBoards() {
    const startError = Puzzle.validate(start), goalError = Puzzle.validate(goal);
    if (startError || goalError) return startError ? `Initial state: ${startError}` : `Goal state: ${goalError}`;
    if (!Puzzle.isReachable(start, goal)) return 'These boards are not mutually reachable. Change the tile order or generate a new solvable board.';
    return null;
  }
  function invalidateRun() {
    if (activeWorker) { activeWorker.terminate(); activeWorker = null; $('runBtn').disabled = false; }
    if (playback) playback.pause(); playback = null;
    $('pauseBtn').disabled = $('stepBtn').disabled = $('stepBackBtn').disabled = true; $('pauseBtn').textContent = 'Ⅱ Pause';
    $('searchBadge').textContent = 'NOT STARTED'; $('searchBadge').className = 'status-badge';
    $('currentBoard').replaceChildren(); $('successorList').textContent = 'Waiting for search'; $('successorCount').textContent = '0'; $('frontierList').textContent = 'Waiting for search'; $('exploredList').textContent = 'Waiting for search';
    $('frontierCount').textContent = $('exploredCount').textContent = '0'; $('depthLabel').textContent = 'Depth —'; $('eventText').textContent = 'Run BFS to inspect the FIFO queue and explored set.';
    $('timeline').max = 0; $('timeline').value = 0; $('timelineCount').textContent = '0 / 0'; $('resultStatus').textContent = 'Awaiting a run';
    ['statSolution', 'statMoves', 'statGenerated', 'statExpanded', 'statDepth', 'statTime', 'statCost', 'statMemory'].forEach((id) => $(id).textContent = '—');
    $('pathCount').textContent = '0 STATES'; $('solutionPath').replaceChildren(node('div', 'path-empty', 'The solution sequence appears after a successful search.'));
  }
  function renderMini(hostId, board) {
    const host = $(hostId); host.replaceChildren();
    if (!board) return;
    board.forEach((v) => host.append(node('span', `mini-tile${v === 0 ? ' blank-tile' : ''}`, v ? String(v) : '·')));
  }
  function renderStateList(hostId, keys, marker) {
    const host = $(hostId); host.replaceChildren();
    if (!keys.length) { host.append(node('span', 'empty-list', 'Empty')); return; }
    keys.forEach((key) => { const row = node('div', `state-chip${key === marker ? ' current' : ''}`, key.replace('0', '·')); host.append(row); });
  }
  function renderEvent(event, index, total) {
    $('timeline').value = Math.max(0, index); $('timelineCount').textContent = `${Math.max(0, index + 1)} / ${total}`;
    if (!event) { renderMini('currentBoard', null); return; }
    renderMini('currentBoard', event.currentKey.split('').map(Number));
    $('depthLabel').textContent = `Depth ${event.depth}`;
    $('frontierCount').textContent = `${event.frontierCount}${event.frontierCount > event.frontierKeys.length ? ' (showing 12)' : ''}`;
    $('exploredCount').textContent = `${event.exploredCount}${event.exploredCount > event.exploredKeys.length ? ' (last 12)' : ''}`;
    $('successorCount').textContent = String(event.childKeys.length);
    renderStateList('successorList', event.childKeys, null);
    renderStateList('frontierList', event.frontierKeys, null); renderStateList('exploredList', event.exploredKeys, event.currentKey);
    $('eventText').textContent = `Expanded ${event.currentKey.replace('0', '·')} at depth ${event.depth}; path cost g(n) = ${event.pathCost}. Parent: ${event.parentKey ? event.parentKey.replace('0', '·') : 'none (initial state)'}.`;
    if (event.complete) $('eventText').textContent += ' Goal reached.';
  }
  function renderPath(path) {
    const host = $('solutionPath'); host.replaceChildren();
    $('pathCount').textContent = `${path.length} STATES`;
    path.forEach((step, index) => {
      const group = node('div', 'path-step'), boardEl = node('div', 'path-board');
      step.board.forEach((v) => boardEl.append(node('span', `path-tile${v === 0 ? ' blank-tile' : ''}`, v ? String(v) : '')));
      const figure = node('div', 'path-figure'); figure.append(boardEl, node('div', 'path-caption', index === 0 ? 'START' : `STEP ${index}`)); group.append(figure);
      if (index < path.length - 1) group.append(node('span', 'path-arrow', `→ ${path[index + 1].move.direction}`)); host.append(group);
    });
  }
  function displayResult(data) {
    $('searchBadge').textContent = data.found ? 'SOLUTION FOUND' : data.error ? 'NOT SEARCHED' : 'NOT FOUND'; $('searchBadge').className = `status-badge${data.found ? ' solved' : ''}`;
    $('resultStatus').textContent = data.error ? 'Search not run' : data.found ? 'Shortest solution found' : 'No solution found';
    $('statSolution').textContent = data.error ? 'Not run' : data.found ? 'Found' : 'Not found'; $('statMoves').textContent = data.found ? String(data.path.length - 1) : '—';
    $('statGenerated').textContent = data.generated.toLocaleString(); $('statExpanded').textContent = data.expanded.toLocaleString(); $('statDepth').textContent = String(data.maximumDepth);
    $('statTime').textContent = `${data.elapsedMs.toFixed(2)} ms`; $('statCost').textContent = data.found ? `${data.path.length - 1} (unit)` : '—'; $('statMemory').textContent = `≈ ${(data.estimatedBytes / 1024).toFixed(1)} KB`;
    if (data.found) renderPath(data.path); else { $('pathCount').textContent = data.error ? 'NOT RUN' : 'NO PATH'; $('solutionPath').replaceChildren(node('div', 'path-empty', data.error || 'No path found. Check that both board permutations are valid and reachable.')); }
    if (data.error) setMessage(data.error, 'error');
    else if (data.eventsTruncated) setMessage(`Search complete. Playback stores the first ${data.events.length.toLocaleString()} expansions; all result counts cover the full search.`, 'success');
    else setMessage(data.found ? `Shortest path found in ${data.path.length - 1} moves. Step through ${data.events.length.toLocaleString()} recorded expansions.` : 'Search completed without a solution.', data.found ? 'success' : 'error');
  }
  function run() {
    const error = validateBoards(); if (error) { setMessage(error, 'error'); return; }
    if (playback) playback.pause(); start = start.slice(); goal = goal.slice();
    setMessage('Running BFS in a background worker…', ''); $('runBtn').disabled = true; $('searchBadge').textContent = 'SEARCHING'; $('searchBadge').className = 'status-badge running';
    let worker;
    try { worker = new Worker('js/bfs-worker.js'); activeWorker = worker; }
    catch (error) { $('runBtn').disabled = false; setMessage(`Could not start the search worker: ${error.message || 'serve the project over HTTP and try again.'}`, 'error'); return; }
    worker.onmessage = (event) => {
      worker.terminate(); if (activeWorker === worker) activeWorker = null; $('runBtn').disabled = false;
      if (event.data.error) { setMessage(event.data.error, 'error'); return; }
      const data = event.data.result; displayResult(data);
      $('stepBtn').disabled = $('stepBackBtn').disabled = $('pauseBtn').disabled = data.events.length === 0;
      playback = Visualizer.create(data.events, renderEvent, () => Number($('speedSelect').value), updatePlaybackControls);
      $('timeline').max = Math.max(0, data.events.length - 1); $('timeline').value = 0;
      if (data.events.length) playback.play();
      $('runBtn').textContent = data.found ? '↻ Run again' : '↻ Try again';
      if (data.eventsTruncated) $('eventText').textContent += ' Playback history capped at 6,000 expansions; later expansions omitted.';
    };
    worker.onerror = () => { worker.terminate(); if (activeWorker === worker) activeWorker = null; $('runBtn').disabled = false; setMessage('The search worker could not start. Serve the folder locally over HTTP and try again.', 'error'); };
    worker.postMessage({ start, goal });
  }
  function updatePlaybackControls(state) {
    const hasEvents = state.length > 0;
    $('pauseBtn').disabled = !hasEvents;
    $('pauseBtn').textContent = state.playing ? 'Ⅱ Pause' : state.index >= state.length - 1 ? '▶ Replay' : '▶ Resume';
    $('stepBackBtn').disabled = !hasEvents || state.index <= 0;
    $('stepBtn').disabled = !hasEvents || state.index >= state.length - 1;
  }
  function reset() { start = [1, 2, 3, 4, 5, 6, 0, 7, 8]; goal = DEFAULT.slice(); renderBoards(); invalidateRun(); $('runBtn').innerHTML = '▶ &nbsp;Run BFS'; setMessage('Boards reset. The sample puzzle takes two moves.', ''); }
  $('runBtn').addEventListener('click', run);
  $('randomBtn').addEventListener('click', () => { start = Puzzle.randomSolvable(goal, 28); renderBoards(); invalidateRun(); $('runBtn').innerHTML = '▶ &nbsp;Run BFS'; setMessage('New solvable board generated by legal moves from the selected goal.', 'success'); });
  $('resetBtn').addEventListener('click', reset);
  $('stepBtn').addEventListener('click', () => playback && playback.next());
  $('stepBackBtn').addEventListener('click', () => playback && playback.previous());
  $('pauseBtn').addEventListener('click', () => { if (!playback) return; if (playback.playing) playback.pause(); else playback.play(); });
  $('timeline').addEventListener('input', (event) => { if (playback) playback.seek(Number(event.target.value)); });
  $('runBtn').addEventListener('dblclick', (event) => event.preventDefault());
  document.querySelectorAll('.navbar-nav a').forEach((link) => link.addEventListener('click', () => { const collapse = document.querySelector('.navbar-collapse'); if (collapse.classList.contains('show') && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(collapse).hide(); }));
  renderBoards(); invalidateRun();
})();
