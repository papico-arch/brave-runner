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

    current = name;
    if (handlers[name]) handlers[name](params);
  },

  current() { return current; }
};
