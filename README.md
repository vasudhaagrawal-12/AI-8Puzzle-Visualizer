# Interactive 8-Puzzle Problem Solver using AI Search Algorithms

**Student:** Vasudha Agrawal · **Registration number:** 24BCE2582  
**Course:** Artificial Intelligence · **Assignment:** Interactive 8-Puzzle Problem Solver using AI Search Algorithms · **Assigned algorithm:** Breadth-First Search (BFS), Algorithm #1 · **Assignment weight:** 10 marks

## Project overview

A static, browser-based learning tool for the 8-puzzle. Edit an initial and goal board, generate a solvable start state, run a manual BFS implementation, and inspect recorded search expansions, frontier, explored states, statistics, and the shortest solution path. The remaining assignment algorithms are described theoretically; they are not implemented or benchmarked.

## Problem statement and objectives

Given a 3 × 3 board containing tiles 1–8 and one blank, find a sequence of legal blank moves that transforms the initial state into a goal state. The application demonstrates state representation, legal transitions, graph search, parent tracking, path reconstruction, reachability checking, and BFS's shortest-path guarantee for equal move costs.

### State model and legal actions

- A state is a row-major array of nine integers, with `0` for the blank. The default initial state is `1 2 3 / 4 5 6 / 0 7 8`; the default goal is `1 2 3 / 4 5 6 / 7 8 0`.
- The user can edit either board by clicking a cell. Its value cycles while swapping with the cell that held the next value, so the board remains a permutation. A solvable random initial board is made by applying legal moves from the selected goal.
- An action slides one orthogonally adjacent numbered tile into the blank. A transition copies the board, swaps the blank and that tile, and records the blank's direction.
- A state key is the nine-character digit string. For the odd-width 3 × 3 board, reachability is checked by comparing inversion parity after ranking numbered tiles in the selected goal's order. The blank is excluded from the inversion count.

## Technologies

- HTML5, CSS3, Bootstrap 5, vanilla JavaScript (ES6)
- Web Worker for non-blocking BFS
- Node.js built-in test runner for automated tests
- No server-side code or build step

Bootstrap and fonts are loaded from public CDNs. The core app and search logic use no third-party JavaScript libraries. An internet connection is needed for those external styles/fonts; layout and application logic are local.

## BFS working principle

Each board is encoded as a nine-digit string, with `0` representing the blank. A FIFO queue stores discovered boards; a visited set prevents duplicates and is updated when a board is enqueued. Parent and move maps reconstruct the path after the goal is dequeued. For a finite graph with equal edge costs, BFS is complete and returns a path with the fewest moves.

```text
queue ← [start]
visited ← {start}
parent[start] ← null
while queue is not empty:
    state ← queue.popFront()
    if state = goal: return reconstruct(parent)
    for next in legalSuccessors(state):
        if next not in visited:
            visited.add(next)      // when enqueued
            parent[next] ← state
            queue.pushBack(next)
return no solution
```

**Complexity:** a common worst-case bound for BFS with branching factor *b* and a shallowest goal at depth *d* is O(bᵈ⁺¹) time and space. The exact visited-state count depends on the graph and goal order. This implementation has a finite state space: 9! = 362,880 possible permutations, of which 181,440 are reachable from any valid 3 × 3 state. The visited set prevents revisiting those states. BFS can still use substantial memory. The 3 × 3 reachability check compares inversion parity relative to the selected goal ordering.

### Advantages and limitations

BFS is complete on this finite puzzle graph and returns a minimum-move solution when every slide has equal cost. Its queue order makes the shortest-path guarantee straightforward to observe. The trade-off is memory: BFS retains discovered states, queue entries, parent/depth records, and a bounded playback log. The runtime and memory depend on the start and goal states and the user's device.

## Implemented algorithms and heuristics

**Implemented and run:** Breadth-First Search only. It uses a FIFO array queue with a head index, a visited set, parent and move records, depth tracking, and path reconstruction. The search is run in `js/bfs-worker.js` so expansion work does not block the page.

**Not implemented:** DFS, depth-limited search (DLS), iterative-deepening DFS (IDDLS), greedy best-first search (GBFS), and A*. Their table entries on the site are theoretical properties only; the app does not execute them and reports no empirical comparison data for them.

**Heuristics:** BFS does not use a heuristic. For context only, common 8-puzzle heuristic examples for informed search are misplaced-tile count and Manhattan distance (the sum of each numbered tile's row/column distance from its goal cell; exclude the blank). Manhattan distance is admissible for the standard unit-cost puzzle because each tile must move at least its Manhattan distance. Neither heuristic, nor any heuristic selector, is implemented in this project. Do not describe these as measured project features.

### Comparison summary (theoretical; not a benchmark)

| Algorithm | Search order | Complete? | Optimal? | Project status |
| --- | --- | --- | --- | --- |
| BFS | Shallowest first, FIFO | Yes on this finite graph | Yes for equal move costs | Implemented; measured per run |
| DFS | Deepest first, stack | Not generally in infinite-depth spaces; graph search with cycle checks is complete on a finite graph | No | Not implemented |
| DLS | DFS up to limit ℓ | Only when solution depth is within ℓ (with finite branching) | No | Not implemented |
| IDDLS | Repeat DLS with increasing limit | Yes with finite branching | Yes for equal move costs | Not implemented |
| GBFS | Lowest heuristic h(n) | Not generally in infinite spaces; finite graph search with duplicate checks terminates | No | Not implemented |
| A* | Lowest g(n)+h(n) | Under finite branching and positive lower-bounded step costs | With admissible h for tree search; consistency is the standard sufficient condition for graph search without reopening closed states | Not implemented |

Completeness/optimality statements depend on graph-search versus tree-search details, cycle handling, branching, step costs, and heuristic conditions. The table is a theory summary. Only BFS produces this application's run results.

## Features

- Tile editors for both initial and goal permutations
- Reachability and input validation before search
- Solvable random boards generated by legal moves from the goal
- BFS in a dedicated worker, FIFO queue/head index, visited set, parent map and shortest path reconstruction
- Recorded playback with run, pause/resume, next, previous, timeline seeking, speed choices and reset
- Frontier/explored snapshots retain the first 12 and last 12 entries respectively; exact counts are shown. Up to 6,000 expansion events are retained. If the cap is reached, the interface labels truncated playback while aggregate counts still represent the full search.
- Measured search elapsed time and counts; approximate memory estimate only (not a browser heap measurement)
- Responsive overview, search process, results, BFS explanation, theoretical comparison, and student/project details
- Static paths and no backend, suitable for GitHub Pages

## Project structure

```text
AI-8Puzzle-Visualizer/
├── index.html
├── css/style.css
├── js/
│   ├── app.js
│   ├── bfs-worker.js
│   ├── bfs.js
│   ├── puzzle.js
│   └── visualizer.js
├
├── tests/puzzle.test.js
├
└── README.md
```

## Run locally

Use a local HTTP server because browsers generally restrict Web Workers on `file://` URLs. With Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Alternatively use the Live Server extension in an editor. Node.js is not required to use the website.

## Tests

With Node.js installed, run:

```bash
node --test tests/puzzle.test.js
```

Tests cover solved, one-move, multi-move, custom-goal and independently reference-checked shortest paths; a known 31-move case; legal-edge/path reconstruction; invalid and unreachable boards; random generation; legal successors; search counts; worker messaging; and playback plus application controls (using a mocked DOM/worker). Relative static assets and worker imports are checked. A real browser/cross-browser end-to-end run and a published GitHub Pages deployment have not been verified.

## Statistics and counting conventions

- **Nodes generated:** unique states discovered and enqueued, including the initial state. A successor already in the visited set is not counted again.
- **Nodes expanded:** states dequeued and inspected, including the goal when it is dequeued. The goal's successors are not generated.
- **Maximum search depth:** greatest depth of any discovered state, even if it remains in the frontier. The initial state has depth 0.
- **Solution moves:** number of edges in the reconstructed path; the initial state is not a move.
- **Path cost:** unit cost per move, so it equals solution moves when a solution exists.
- **Execution time:** browser `performance.now()` elapsed inside `BFS.solve`, including validation, parity check, BFS data-structure setup, queue expansion and event recording; it excludes worker startup/transfer, path reconstruction, and DOM rendering. Timings vary by machine and browser.
- **Approximate memory:** an estimate for core search records, not a measured heap size. The formula uses rough byte allowances per unique state: 18 bytes for the 9-character key, 72 for its numeric board array, 8 for its queue reference, 32 for its visited entry, 64 for its parent entry, and 48 for its depth entry. Browser object overhead varies; the returned path, playback event storage and temporary worker-message copies are excluded.
- **Parity-rejected input:** generated and expanded are both 0 because no BFS queue search is run. Invalid input is rejected by the interface; direct solver calls return an error result with zero search counts.

## Assignment verification checklist

- [x] Project identity and student details are present in the site and README.
- [x] BFS uses a FIFO array queue with a head index, unique state keys, visited-on-enqueue, parent/move tracking, and path reconstruction.
- [x] Board validation, custom goals, inversion parity, and legal random generation are covered by tests.
- [x] Known shallow distances and an independent level-frontier reference check support the shortest-path claim; every returned path edge is checked for legality.
- [x] Search event playback includes current expansion, generated successors, frontier, explored states, parent, depth, and path cost. History truncation is disclosed.
- [x] BFS statistics and their conventions are defined above; memory is explicitly an estimate.
- [x] BFS is the only implemented/benchmarked algorithm; comparison rows for DFS, DLS, IDDLS, GBFS, and A* are theoretical.
- [x] Relative assets, worker URLs, and static-hosting deployment instructions are present.
- [x] There is no package manifest or build configuration; runtime assets are static and tests use Node's built-in runner.
- Screenshots are not included in this repository.


## GitHub repository and Pages

This project has not been published to GitHub Pages. The following steps describe how to deploy it when needed:

Deployment steps:

1. Create a GitHub repository and add this project to its root (or configure Pages to use the folder containing `index.html`).
2. Push the project to GitHub using your normal Git workflow.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, select the intended branch and `/ (root)` folder, then save.
4. Wait for the Pages workflow to finish and open the URL GitHub reports. Verify the page and worker load before sharing the deployment URL.

This workspace has not pushed the project or published a deployment.

## References

These sources support the search and heuristic explanations; they do not represent benchmark data from this app.

1. Stuart Russell and Peter Norvig, *Artificial Intelligence: A Modern Approach*, 4th ed., Chapter 3, “Solving Problems by Searching.” [Author-hosted chapter PDF](https://aima.cs.berkeley.edu/4th-ed/pdfs/newchap03.pdf).
2. Stuart Russell and Peter Norvig, *Artificial Intelligence: A Modern Approach*, 4th ed., Chapter 4, especially §4.2 “Heuristic Functions” (misplaced-tile and Manhattan-distance examples for the 8-puzzle). [Author-hosted chapter PDF](https://aima.cs.berkeley.edu/4th-ed/pdfs/newchap04.pdf).
3. Pearson, *Artificial Intelligence: A Modern Approach*, 4th edition catalog entry, ISBN 9780134610993. [Publisher listing](https://www.pearson.com/en-us/subject-catalog/p/artificial-intelligence-a-modern-approach/P200000003500/9780134610993).

## Acknowledgements

Prepared as a course assignment demonstration for Artificial Intelligence. Bootstrap 5 is loaded from its public CDN, as described above.
