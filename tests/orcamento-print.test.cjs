const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../orcamento.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).find(code => code.includes('function syncPrint()'));

function imprimir(overrides = {}) {
  const values = { empresa: 'Empresa fictícia', cliente: 'Cliente fictício', servico: 'Serviço de teste', quantidade: '3', unitario: '100', desconto: '20', observacoes: '', ...overrides };
  const nodes = new Map(Object.entries(values).map(([id, value]) => [id, { value: String(value), textContent: '' }]));
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', textContent: 'anterior' });
    return nodes.get(id);
  };
  let click, beforePrint, alerts = 0, prints = 0, stopped = false;
  get('printBudget').addEventListener = (event, handler) => { if (event === 'click') click = handler; };
  vm.runInNewContext(script, {
    document: { getElementById: get, addEventListener: (event, handler) => { if (event === 'DOMContentLoaded') handler(); } },
    window: {
      addEventListener: (event, handler) => { if (event === 'beforeprint') beforePrint = handler; },
      print: () => { prints++; beforePrint(); }
    },
    alert: () => alerts++, Intl, Date
  });
  click({ stopImmediatePropagation() { stopped = true; } });
  return { get, prints, alerts, stopped };
}

test('Orçamento: impressão válida mantém subtotal, desconto e total e abre uma única vez', () => {
  const r = imprimir();
  assert.equal(r.prints, 1);
  assert.equal(r.alerts, 0);
  assert.equal(r.stopped, true);
  assert.match(r.get('pdfSubtotal').textContent, /300,00/);
  assert.match(r.get('pdfDesconto').textContent, /20,00/);
  assert.match(r.get('pdfTotal').textContent, /280,00/);
  assert.equal(r.get('pdfCliente').textContent, 'Cliente fictício');
});

test('Orçamento: campos obrigatórios vazios não viram zero na impressão', () => {
  for (const campo of ['quantidade', 'unitario', 'desconto']) {
    for (const value of ['', '   ']) {
      const r = imprimir({ [campo]: value });
      assert.equal(r.prints, 0, campo);
      assert.equal(r.alerts, 1, campo);
      assert.equal(r.get('pdfTotal').textContent, 'anterior');
    }
  }
});

test('Orçamento: total infinito, negativos, quantidade fora do mínimo e desconto excessivo bloqueiam impressão', () => {
  for (const values of [
    { quantidade: '1e308', unitario: '1e308' }, { unitario: '-1' },
    { quantidade: '0.001' }, { desconto: '-1' }, { desconto: '301' },
    { unitario: 'NaN' }, { desconto: 'Infinity' }
  ]) {
    const r = imprimir(values);
    assert.equal(r.prints, 0, JSON.stringify(values));
    assert.equal(r.alerts, 1);
    assert.equal(r.get('pdfTotal').textContent, 'anterior');
  }
});
