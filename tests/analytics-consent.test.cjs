const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');
const storageKey = 'precocerto_analytics_consent';

function runAnalytics(initialConsent = null) {
  let consent = initialConsent;
  let reloads = 0;
  const listeners = new Map();
  const head = [];
  const body = [];
  const node = tag => ({
    tag, style: {}, hidden: false,
    setAttribute() {}, addEventListener() {},
    querySelector() { return node('button'); }
  });
  const window = {
    location: {reload() { reloads += 1; }},
    addEventListener(event, handler) {
      const handlers = listeners.get(event) || [];
      handlers.push(handler);
      listeners.set(event, handlers);
    }
  };
  const document = {
    readyState: 'complete',
    createElement: node,
    head: {appendChild(child) { head.push(child); }},
    body: {appendChild(child) { body.push(child); }}
  };
  const localStorage = {
    getItem(key) { return key === storageKey ? consent : null; },
    setItem(key, value) { if (key === storageKey) consent = value; }
  };
  vm.runInNewContext(source, {window, document, localStorage, Date}, {filename:'analytics.js'});
  return {
    window,
    panel: () => body.find(child => child.id === 'pc-consent-panel'),
    scripts: () => head.filter(child => child.tag === 'script'),
    reloads: () => reloads,
    storage(key, value) {
      consent = value;
      for (const handler of listeners.get('storage') || []) handler({key});
    }
  };
}

test('Analytics: consentimento recebido de outra aba inicia uma única configuração', () => {
  const e = runAnalytics('rejected');
  assert.equal(e.scripts().length, 0);
  assert.equal(e.panel().hidden, true);
  e.storage('outra_preferencia', 'accepted');
  assert.equal(e.scripts().length, 0);
  e.storage(storageKey, 'accepted');
  e.storage(storageKey, 'accepted');
  assert.equal(e.scripts().length, 1);
  assert.equal(e.scripts()[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-Q5W00LDHZD');
  assert.equal(e.window.dataLayer.filter(args => args[0] === 'config').length, 1);
  assert.equal(e.panel().hidden, true);
  assert.equal(e.reloads(), 0);
});

test('Analytics: revogação em outra aba recarrega e recusa não inicia coleta', () => {
  const e = runAnalytics('accepted');
  assert.equal(e.scripts().length, 1);
  e.storage('outra_preferencia', 'rejected');
  assert.equal(e.reloads(), 0);
  e.storage(storageKey, 'rejected');
  assert.equal(e.reloads(), 1);
  const reloaded = runAnalytics('rejected');
  assert.equal(reloaded.scripts().length, 0);
  assert.equal(typeof reloaded.window.gtag, 'undefined');
  assert.equal(reloaded.panel().hidden, true);
});

test('Analytics: limpar o armazenamento remove coleta e volta a pedir consentimento', () => {
  const e = runAnalytics('accepted');
  e.storage(null, null);
  assert.equal(e.reloads(), 1);
  const reloaded = runAnalytics();
  assert.equal(reloaded.scripts().length, 0);
  assert.equal(typeof reloaded.window.gtag, 'undefined');
  assert.equal(reloaded.panel().hidden, false);
  const rejected = runAnalytics('rejected');
  rejected.storage(null, null);
  assert.equal(rejected.reloads(), 0);
  assert.equal(rejected.scripts().length, 0);
  assert.equal(rejected.panel().hidden, false);
});
