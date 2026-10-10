const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const shared = fs.readFileSync(path.join(__dirname, '../extension/shared.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8');

function setup(muted = false) {
  const video = { muted, volume: 0.42 };
  const classes = new Set();
  const buttons = [];
  const requests = [];
  const player = {
    classList: { contains: name => classes.has(name) },
    querySelector: () => player.video,
    querySelectorAll: selectors => buttons.filter(button => selectors.split(',').some(selector => button.selectors.includes(selector.trim()))),
    setAttribute: (name, value) => { player[name] = value; },
    video
  };
  let currentPlayer = player, tick, now = 0;
  const listeners = {}, observers = [];
  const document = {
    getElementById: () => currentPlayer,
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  vm.runInNewContext(shared + source, {
    chrome: { runtime: { getManifest: () => ({version:'0.3.0'}), sendMessage: message => { requests.push(message); return Promise.resolve({clicked: true}); }, onMessage: { addListener: fn => { listeners.message = fn; } } } },
    document,
    window: { addEventListener: (name, fn) => { listeners[name] = fn; } },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe() {} disconnect() {}
    },
    getComputedStyle: button => ({ display: button.display, visibility: button.visibility, opacity: button.opacity ?? '1', pointerEvents: button.pointerEvents ?? 'auto' }),
    setInterval: fn => { tick = fn; return 1; },
    clearInterval: () => { tick = null; },
    queueMicrotask: fn => fn(),
    performance: { now: () => now }
  });
  return {
    video, player, classes, buttons, listeners, requests,
    advance: () => { now += 200; tick?.(); },
    mutate: () => observers[0].fn(),
    setPlayer: value => { currentPlayer = value; },
    button: (options = {}) => {
      const button = {
        disabled: false, display: 'block', visibility: 'visible', visible: true,
        clicks: 0, ariaDisabled: null,
        selectors: ['.ytp-ad-skip-button'],
        querySelector() { return this.child ?? null; },
        getAttribute() { return this.ariaDisabled; },
        getClientRects() { return this.visible ? [{}] : []; },
        click() { this.clicks++; },
        ...options
      };
      buttons.push(button);
      return button;
    }
  };
}

test('child Skip overrides inert ancestor and uses browser request', () => {
  const env = setup();
  env.classes.add('ad-showing');
  const ancestor = {display: 'block', visibility: 'hidden', pointerEvents: 'none', opacity: '1'};
  const child = env.button({selectors: [], parentElement: ancestor});
  env.button({child, pointerEvents: 'none', visibility: 'hidden'});
  env.mutate();
  assert.equal(env.requests.length, 1);
  assert.equal(env.requests[0].type, 'trusted-skip');
  assert.equal(child.clicks, 0);
  assert.equal(env.video.muted, true);
  env.classes.clear(); env.advance();
  assert.equal(env.video.muted, false);
});
test('disabled or hidden actual Skip never requests browser input', () => {
  const env = setup(); env.classes.add('ad-showing');
  const button = env.button({disabled: true});
  env.mutate(); assert.equal(env.requests.length, 0);
  button.disabled = false; button.opacity = '0';
  env.mutate(); assert.equal(env.requests.length, 0);
  button.opacity = '1'; button.pointerEvents = 'none';
  env.mutate(); assert.equal(env.requests.length, 0);
});

test('preserves prior mute state and restores replaced video elements', () => {
  const env = setup(true); env.classes.add('ad-showing'); env.advance();
  const next = {muted: false}; env.player.video = next; env.advance();
  assert.equal(next.muted, true);
  env.classes.clear(); env.advance();
  assert.equal(env.video.muted, true); assert.equal(next.muted, false);
});
test('page exit restores sound and cached return resumes muting', () => {
  const env = setup(); env.classes.add('ad-showing'); env.advance();
  env.listeners.pagehide(); assert.equal(env.video.muted, false);
  env.listeners.pageshow({persisted:true}); assert.equal(env.video.muted, true);
  env.classes.clear(); env.advance(); assert.equal(env.video.muted, false);
});
test('requests once per second and reports manifest version', () => {
  const env = setup(); env.classes.add('ad-showing'); env.button();
  env.mutate(); env.mutate(); assert.equal(env.requests.length, 1);
  for(let i=0;i<5;i++) env.advance(); assert.equal(env.requests.length, 2);
  let report; env.listeners.message({type:'ad-mute-status'}, {}, value=>{report=value;});
  assert.equal(report.version, '0.3.0'); assert.equal(report.lastAdReport.attempts, 2);
});
