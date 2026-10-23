/* Deterministic event playback. Playback never re-runs search. */
(function (root) {
  'use strict';
  function create(events, render, delay, onChange) {
    let index = -1, timer = null, isPlaying = false;
    function notify() { if (onChange) onChange({ index, playing: isPlaying, length: events.length }); }
    function show(next) { index = Math.max(-1, Math.min(events.length - 1, next)); render(index >= 0 ? events[index] : null, index, events.length); notify(); }
    function stop() { if (timer !== null) clearTimeout(timer); timer = null; isPlaying = false; notify(); }
    function tick() { if (!isPlaying) return; if (index >= events.length - 1) { stop(); return; } show(index + 1); timer = setTimeout(tick, delay()); }
    return {
      next() { stop(); show(index + 1); },
      previous() { stop(); show(index - 1); },
      play() { if (index >= events.length - 1) show(-1); if (!isPlaying) { isPlaying = true; notify(); tick(); } },
      pause: stop,
      reset() { stop(); show(-1); },
      seek(target) { stop(); show(target); },
      get index() { return index; },
      get playing() { return isPlaying; }
    };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Visualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
