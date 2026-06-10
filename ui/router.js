const handlers = {};
let current = null;

export const router = {
  register(name, fn) {
    handlers[name] = fn;
  },

  go(name, params = {}) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.add('active');

    const overlay = document.getElementById('orientation-overlay');
    if (name === 'game') {
      overlay.classList.add('game-active');
    } else {
      overlay.classList.remove('game-active');
    }

    current = name;
    if (handlers[name]) handlers[name](params);
  },

  current() { return current; }
};
