'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
global.Puzzle = require('../js/puzzle.js');
const BFS = require('../js/bfs.js');
const Visualizer = require('../js/visualizer.js');
const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0];

test('already solved board has zero moves', () => { const r = BFS.solve(goal, goal); assert.equal(r.found, true); assert.equal(r.path.length, 1); assert.equal(r.expanded, 1); });
test('one move puzzle returns shortest one move path', () => { const r = BFS.solve([1, 2, 3, 4, 5, 6, 7, 0, 8], goal); assert.equal(r.path.length - 1, 1); assert.equal(r.path[1].move.direction, 'right'); });
test('two move puzzle returns shortest path and valid parent reconstruction', () => { const r = BFS.solve([1, 2, 3, 4, 5, 6, 0, 7, 8], goal); assert.equal(r.path.length - 1, 2); assert.deepEqual(r.path[0].board, [1, 2, 3, 4, 5, 6, 0, 7, 8]); assert.deepEqual(r.path.at(-1).board, goal); assert.deepEqual(r.path.map((p) => p.depth), [0, 1, 2]); });
test('board validation rejects duplicate, missing, and wrong-size boards', () => { assert.match(Puzzle.validate([1, 1, 2, 3, 4, 5, 6, 7, 0]), /exactly once/); assert.match(Puzzle.validate([1, 2]), /exactly 9/); assert.match(Puzzle.validate([1, 2, 3, 4, 5, 6, 7, 8, 9]), /integers/); });
test('inversion parity rejects unreachable board', () => { assert.equal(Puzzle.isReachable([2, 1, 3, 4, 5, 6, 7, 8, 0], goal), false); assert.equal(Puzzle.isReachable([1, 2, 3, 4, 5, 6, 7, 0, 8], goal), true); });
test('random puzzle generation always produces a valid reachable board', () => { for (let i = 0; i < 100; i++) { const board = Puzzle.randomSolvable(goal, 30); assert.equal(Puzzle.validate(board), null); assert.equal(Puzzle.isReachable(board, goal), true); } });
test('random generation honors an explicit zero-move request', () => { assert.deepEqual(Puzzle.randomSolvable(goal, 0), goal); });
test('random generation rejects an invalid goal board', () => { assert.throws(() => Puzzle.randomSolvable([1, 1, 2, 3, 4, 5, 6, 7, 0]), /invalid goal/i); });
test('successor generation has only legal unique states', () => { const next = Puzzle.successors(goal); assert.equal(next.length, 2); assert.deepEqual(next.map((s) => s.direction), ['up', 'left']); assert.equal(new Set(next.map((s) => Puzzle.key(s.board))).size, 2); });
test('BFS returns the known four-move path and reconstructs both endpoints', () => { const start = [1, 2, 3, 5, 0, 6, 4, 7, 8]; const r = BFS.solve(start, goal); assert.equal(r.path.length - 1, 4); assert.equal(r.path[0].key, Puzzle.key(start)); assert.equal(r.path.at(-1).key, Puzzle.key(goal)); });
test('search handles an unreachable goal defensively', () => { const r = BFS.solve(goal, [2, 1, 3, 4, 5, 6, 7, 8, 0]); assert.equal(r.found, false); assert.equal(r.path.length, 0); });
test('playback supports previous, next, pause, resume and reset without rerunning', async () => {
  const seen = [], events = [{ n: 0 }, { n: 1 }, { n: 2 }]; const player = Visualizer.create(events, (e, i) => seen.push(i), () => 1);
  player.next(); player.next(); assert.equal(player.index, 1); player.previous(); assert.equal(player.index, 0); player.play(); await new Promise((resolve) => setTimeout(resolve, 10)); player.pause(); assert.ok(player.index >= 1); player.reset(); assert.equal(player.index, -1); assert.deepEqual(seen.slice(0, 3), [0, 1, 0]);
});
test('static hosting uses relative assets and wires board reset', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  assert.match(html, /href="css\/style\.css"/); assert.match(app, /new Worker\('js\/bfs-worker\.js'\)/);
  assert.doesNotMatch(html, /href="\//); assert.match(app, /resetBtn'\)\.addEventListener\('click', reset\)/); assert.match(app, /start = \[1, 2, 3, 4, 5, 6, 0, 7, 8\]/);
  const localRefs = [...html.matchAll(/(?:src|href)="(?!https?:|#)([^"?]+)"/g)].map((match) => match[1]);
  for (const ref of localRefs) assert.ok(fs.existsSync(path.join(__dirname, '..', ref)), `local asset exists: ${ref}`);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, ref] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(ref), `navigation target exists: #${ref}`);
  for (const identity of ['Vasudha Agrawal', '24BCE2582', 'Artificial Intelligence', 'Breadth-First Search', 'ALGORITHM NO.']) assert.ok(html.includes(identity), `page contains project identity: ${identity}`);
  assert.match(html, /GENERATED SUCCESSORS/); assert.match(html, /FRONTIER/); assert.match(html, /EXPLORED/);
  const worker = fs.readFileSync(path.join(__dirname, '..', 'js', 'bfs-worker.js'), 'utf8');
  for (const [, ref] of worker.matchAll(/importScripts\('([^']+)'/g)) assert.ok(fs.existsSync(path.join(__dirname, '..', 'js', ref)), `worker import exists: ${ref}`);
});

test('worker imports local modules and returns a structured BFS result', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'bfs-worker.js'), 'utf8');
  const responses = [], imports = [];
  const sandbox = { Puzzle, BFS, performance, importScripts: (...refs) => { imports.push(...refs); for (const ref of refs) assert.ok(fs.existsSync(path.join(__dirname, '..', 'js', ref))); }, self: { postMessage: (message) => responses.push(message) } };
  vm.runInNewContext(source, sandbox);
  sandbox.self.onmessage({ data: { start: [1, 2, 3, 4, 5, 6, 7, 0, 8], goal } });
  assert.deepEqual(imports, ['puzzle.js', 'bfs.js']); assert.equal(responses.length, 1);
  assert.equal(responses[0].result.found, true); assert.equal(responses[0].result.path.length - 1, 1);
});

function assertLegalPath(path, start, goal) {
  assert.deepEqual(path[0].board, start);
  assert.deepEqual(path.at(-1).board, goal);
  for (let i = 1; i < path.length; i++) {
    assert.ok(Puzzle.successors(path[i - 1].board).some((s) => Puzzle.key(s.board) === Puzzle.key(path[i].board)), `path edge ${i - 1} → ${i} must be one legal blank move`);
    assert.equal(path[i].depth, i);
  }
}

function referenceDistance(start, target) {
  // Independent level-frontier reference used only for shallow reproducible cases.
  let layer = [start.slice()]; const seen = new Set([Puzzle.key(start)]); let distance = 0;
  while (layer.length) {
    if (layer.some((board) => Puzzle.key(board) === Puzzle.key(target))) return distance;
    const nextLayer = [];
    for (const board of layer) for (const successor of Puzzle.successors(board)) {
      const key = Puzzle.key(successor.board);
      if (!seen.has(key)) { seen.add(key); nextLayer.push(successor.board); }
    }
    layer = nextLayer; distance++;
  }
  return Infinity;
}

test('BFS independently matches reference distances and every path edge is legal', () => {
  const cases = [
    { start: goal, target: goal, expected: 0 },
    { start: [1, 2, 3, 4, 5, 6, 7, 0, 8], target: goal, expected: 1 },
    { start: [1, 2, 3, 4, 5, 6, 0, 7, 8], target: goal, expected: 2 },
    { start: [1, 2, 3, 5, 0, 6, 4, 7, 8], target: goal, expected: 4 },
    { start: goal, target: [1, 2, 3, 4, 5, 6, 0, 7, 8], expected: 2 }
  ];
  for (const { start, target, expected } of cases) {
    assert.equal(referenceDistance(start, target), expected, 'fixture distance is independently established');
    const result = BFS.solve(start, target);
    assert.equal(result.found, true); assert.equal(result.path.length - 1, expected);
    assertLegalPath(result.path, start, target);
  }
});

test('custom goals use parity relative to their tile ordering and solve correctly', () => {
  const target = [1, 2, 3, 4, 5, 6, 0, 7, 8], start = goal;
  assert.equal(Puzzle.isReachable(start, target), true);
  const result = BFS.solve(start, target);
  assert.equal(result.path.length - 1, 2); assertLegalPath(result.path, start, target);
});

test('validation catches invalid count, duplicate, missing blank, bad values and non-integers', () => {
  assert.match(Puzzle.validate([1, 2, 3, 4, 5, 6, 7, 8]), /exactly 9/);
  assert.match(Puzzle.validate([1, 1, 2, 3, 4, 5, 6, 7, 0]), /exactly once/);
  assert.match(Puzzle.validate([1, 2, 3, 4, 5, 6, 7, 8, 8]), /exactly once/);
  assert.match(Puzzle.validate([1, 2, 3, 4, 5, 6, 7, 8, 9]), /integers/);
  assert.match(Puzzle.validate([1, 2, 3, 4, 5, 6, 7, 8, 1.5]), /integers/);
  assert.match(Puzzle.validate(null), /exactly 9/);
  assert.match(BFS.solve([1, 2, 3, 4, 5, 6, 7, 8], goal).error, /Invalid initial/);
  assert.match(BFS.solve(goal, [1, 2, 3, 4, 5, 6, 7, 8, 8]).error, /Invalid goal/);
});

test('unreachable states are rejected before queue expansion', () => {
  const result = BFS.solve([2, 1, 3, 4, 5, 6, 7, 8, 0], goal);
  assert.equal(result.found, false); assert.match(result.error, /not mutually reachable/);
  assert.equal(result.generated, 0); assert.equal(result.expanded, 0); assert.equal(result.events.length, 0);
});

test('statistics count start and dequeued goal once, exclude duplicate generation', () => {
  const solved = BFS.solve(goal, goal);
  assert.deepEqual({ generated: solved.generated, expanded: solved.expanded, depth: solved.maximumDepth, queue: solved.queueLength }, { generated: 1, expanded: 1, depth: 0, queue: 1 });
  const oneMove = BFS.solve([1, 2, 3, 4, 5, 6, 7, 0, 8], goal);
  assert.equal(oneMove.generated, oneMove.discoveredCount);
  assert.equal(oneMove.expanded, 3); // start, one earlier depth-one state, then goal is dequeued third
  assert.equal(oneMove.maximumDepth, 2); // another expanded depth-one state discovered depth-two successors first
  assert.equal(oneMove.path.at(-1).depth, 1);
  assert.equal(oneMove.events.at(-1).childKeys.length, 0); // goal is not expanded into successors
  assert.equal(oneMove.events.at(-1).pathCost, 1);
  const start = [1, 2, 3, 4, 5, 6, 7, 0, 8], firstSuccessor = Puzzle.successors(start)[0].board;
  assert.deepEqual(oneMove.events.map((event) => event.currentKey), [Puzzle.key(start), Puzzle.key(firstSuccessor), Puzzle.key(goal)]);
  assert.ok(oneMove.expanded <= oneMove.generated);
  assert.ok(oneMove.elapsedMs >= 0); assert.ok(oneMove.estimatedBytes > 0);
});

test('successors respect all board boundaries and report the blank move direction', () => {
  const corner = Puzzle.successors([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(corner.map((s) => s.direction), ['right', 'down']);
  const center = Puzzle.successors([1, 2, 3, 4, 0, 5, 6, 7, 8]);
  assert.equal(center.length, 4);
  for (const { board, direction, movedTile } of [...corner, ...center]) {
    assert.equal(Puzzle.validate(board), null); assert.ok(movedTile >= 1 && movedTile <= 8);
    assert.ok(['up', 'right', 'down', 'left'].includes(direction));
  }
});

test('random boards can be solved to their custom goal and always reconstruct legal paths', () => {
  const target = [1, 2, 3, 4, 5, 6, 0, 7, 8];
  for (let i = 0; i < 12; i++) {
    const start = Puzzle.randomSolvable(target, 10 + i);
    assert.equal(Puzzle.validate(start), null); assert.equal(Puzzle.isReachable(start, target), true);
    const result = BFS.solve(start, target); assert.equal(result.found, true); assertLegalPath(result.path, start, target);
  }
});

test('hard 31-move case terminates, returns optimal path, and labels capped playback', () => {
  const hardStart = [8, 6, 7, 2, 5, 4, 3, 0, 1], result = BFS.solve(hardStart, goal);
  assert.equal(result.found, true); assert.equal(result.path.length - 1, 31);
  assert.equal(result.generated, 181440); assert.equal(result.expanded, 181440);
  assert.equal(result.maximumDepth, 31); assert.equal(result.events.length, BFS.MAX_RECORDED_EVENTS);
  assert.equal(result.eventsTruncated, true); assertLegalPath(result.path, hardStart, goal);
});

test('playback controls keep index stable and notify accurate pause/resume/end state', async () => {
  const states = [], seen = [];
  const player = Visualizer.create([{ n: 0 }, { n: 1 }, { n: 2 }], (event, index) => seen.push(index), () => 1, (state) => states.push(state));
  player.next(); player.next(); assert.equal(player.index, 1);
  player.previous(); assert.equal(player.index, 0);
  player.seek(2); assert.equal(player.index, 2);
  player.play(); assert.equal(player.playing, true); player.pause(); assert.equal(player.playing, false);
  player.reset(); assert.equal(player.index, -1);
  player.play(); await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(player.index, 2); assert.equal(player.playing, false);
  assert.ok(states.some((state) => state.playing)); assert.equal(states.at(-1).index, 2);
  assert.ok(seen.includes(0) && seen.includes(2));
});

test('application wires run, pause/resume, step navigation, random generation and reset', () => {
  class MockElement {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.className = ''; this.value = ''; this.disabled = false; this._text = ''; this.classList = { toggle: (name, force) => { const names = new Set(this.className.split(/\s+/).filter(Boolean)); if (force) names.add(name); else names.delete(name); this.className = [...names].join(' '); }, contains: (name) => this.className.split(/\s+/).includes(name) }; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
    set innerHTML(value) { this.textContent = value; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; this._text = ''; }
    click() { if (!this.disabled && this.listeners.click) this.listeners.click({ target: this }); }
    input() { if (this.listeners.input) this.listeners.input({ target: this }); }
  }
  const ids = ['startBoard', 'goalBoard', 'runBtn', 'pauseBtn', 'stepBtn', 'stepBackBtn', 'randomBtn', 'resetBtn', 'validation', 'searchBadge', 'currentBoard', 'successorList', 'successorCount', 'frontierList', 'exploredList', 'frontierCount', 'exploredCount', 'depthLabel', 'eventText', 'timeline', 'timelineCount', 'resultStatus', 'statSolution', 'statMoves', 'statGenerated', 'statExpanded', 'statDepth', 'statTime', 'statCost', 'statMemory', 'pathCount', 'solutionPath', 'speedSelect'];
  const elements = new Map(ids.map((id) => [id, new MockElement()])); elements.get('speedSelect').value = '10000';
  const documentBefore = global.document, windowBefore = global.window, workerBefore = global.Worker;
  global.document = { getElementById: (id) => elements.get(id) || new MockElement(), createElement: (tag) => new MockElement(tag), querySelectorAll: () => [] };
  global.window = {}; global.Worker = class { postMessage(data) { this.onmessage({ data: { result: BFS.solve(data.start, data.goal) } }); } terminate() {} };
  const appPath = require.resolve('../js/app.js'); delete require.cache[appPath];
  try {
    require(appPath);
    const boardValues = (id) => elements.get(id).children.map((tile) => tile.textContent === '·' ? 0 : Number(tile.textContent));
    assert.deepEqual(boardValues('startBoard'), [1, 2, 3, 4, 5, 6, 0, 7, 8]);
    elements.get('runBtn').click();
    assert.equal(elements.get('statMoves').textContent, '2');
    assert.equal(elements.get('successorCount').textContent, '2');
    elements.get('pauseBtn').click(); assert.equal(elements.get('pauseBtn').textContent, '▶ Resume');
    elements.get('stepBtn').click(); assert.equal(elements.get('depthLabel').textContent, 'Depth 1');
    elements.get('stepBackBtn').click(); assert.equal(elements.get('depthLabel').textContent, 'Depth 0');
    elements.get('pauseBtn').click(); assert.equal(elements.get('pauseBtn').textContent, 'Ⅱ Pause');
    elements.get('pauseBtn').click(); assert.equal(elements.get('pauseBtn').textContent, '▶ Resume');
    elements.get('timeline').value = '0'; elements.get('timeline').input(); assert.equal(elements.get('depthLabel').textContent, 'Depth 0');
    elements.get('randomBtn').click(); assert.equal(Puzzle.validate(boardValues('startBoard')), null); assert.equal(Puzzle.isReachable(boardValues('startBoard'), boardValues('goalBoard')), true);
    elements.get('resetBtn').click();
    assert.deepEqual(boardValues('startBoard'), [1, 2, 3, 4, 5, 6, 0, 7, 8]); assert.deepEqual(boardValues('goalBoard'), goal);
    assert.equal(elements.get('statMoves').textContent, '—'); assert.equal(elements.get('searchBadge').textContent, 'NOT STARTED');
  } finally {
    delete require.cache[appPath]; global.document = documentBefore; global.window = windowBefore; global.Worker = workerBefore;
  }
});
