/* Dedicated worker keeps a full BFS off the interface thread. */
importScripts('puzzle.js', 'bfs.js');
self.onmessage = (event) => {
  try { self.postMessage({ result: BFS.solve(event.data.start, event.data.goal) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Search failed.' }); }
};
