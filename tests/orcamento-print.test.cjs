const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function orcamento(overrides = {}, consent = null) {
  const values = { empresa: 'Empresa fictícia', cliente: 'Cliente fictício', servico: 'Serviço de teste', quantidade: '3', unitario: '100', desconto: '20', observacoes: '', ...overrides };
  const nodes = new Map();
  const get = id => {
    if (id === 'calculator') return null;
    if (!nodes.has(id)) {
      const handlers = {}, classes = new Set();
      nodes.set(id, {
        value: String(values[id] ?? ''), textContent: '', hidden: false,
        classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key) },
        addEventListener(event, handler) { (handlers[event] ||= []).push(handler); },
        fire(event) { for (const handler of handlers[event] || []) handler({preventDefault() {}}); }
      });
    }
    return nodes.get(id);
  };
  get('budget').querySelectorAll = () => Object.keys(values).map(get);
  get('budget').reportValidity = () => {};
  let beforePrint, prints = 0;
  const events = [];
  vm.runInNewContext(source, {
    document: { getElementById: get },
    window: {
      addEventListener(event, handler) { if (event === 'beforeprint') beforePrint = handler; },
      print() { prints++; beforePrint(); },
      gtag: (...args) => events.push(args)
    },
    localStorage: {getItem: () => consent}, Date
  });
  return { get, events, prints: () => prints, beforePrint: () => beforePrint(), print: () => get('printBudget').fire('click') };
}

test('Orçamento: impressão válida mantém subtotal, desconto e total e abre uma única vez', () => {
  const r = orcamento();
  r.print();
  assert.equal(r.prints(), 1);
  assert.match(r.get('pdfSubtotal').textContent, /300,00/);
  assert.match(r.get('pdfDesconto').textContent, /20,00/);
  assert.match(r.get('pdfTotal').textContent, /280,00/);
  assert.equal(r.get('pdfCliente').textContent, 'Cliente fictício');
  assert.equal(r.get('pdfErro').hidden, true);
});

test('Orçamento: todos os campos obrigatórios vazios ou com espaços bloqueiam impressão e removem documento anterior', () => {
  for (const campo of ['empresa', 'cliente', 'servico', 'quantidade', 'unitario', 'desconto']) {
    for (const value of ['', '   ']) {
      const r = orcamento();
      r.get(campo).value = value;
      r.print();
      assert.equal(r.prints(), 0, campo);
      assert.equal(r.get('pdfTotal').textContent, '', campo);
      assert.equal(r.get('pdfCliente').textContent, '', campo);
      assert.equal(r.get('pdfErro').hidden, false);
      assert.equal(r.get('budgetPaper').classList.contains('budget-invalid'), true);
    }
  }
});

test('Orçamento: infinito, NaN, negativos, quantidade fora do mínimo e desconto excessivo bloqueiam impressão', () => {
  for (const values of [
    { quantidade: '1e308', unitario: '1e308' }, { unitario: '-1' },
    { quantidade: '0.001' }, { quantidade: '0' }, { quantidade: '-1' },
    { desconto: '-1' }, { desconto: '301' }, { unitario: 'NaN' },
    { desconto: 'Infinity' }, { quantidade: 'NaN' }, { unitario: 'Infinity' }
  ]) {
    const r = orcamento(values);
    r.print();
    assert.equal(r.prints(), 0, JSON.stringify(values));
    assert.equal(r.get('pdfTotal').textContent, '');
    assert.equal(r.get('total').textContent, '—');
  }
});

test('Orçamento: frações não aceitas pelos campos e valores finitos sem precisão monetária são recusados', () => {
  for (const values of [
    {quantidade:'0.015', desconto:'0'}, {unitario:'1.001', desconto:'0'},
    {desconto:'0.001'}, {unitario:'1e100'}, {desconto:'1e100'},
    {quantidade:'1e100'}, {quantidade:'1000000', unitario:'100000000'}
  ]) {
    const r = orcamento(values);
    r.print();
    assert.equal(r.prints(), 0, JSON.stringify(values));
    assert.equal(r.get('pdfTotal').textContent, '');
  }
  for (const value of ['0.07', '0.29', '999999.99']) {
    const r = orcamento({quantidade:'1', unitario:value, desconto:'0'});
    r.print();
    assert.equal(r.prints(), 1, value);
  }
  const r = orcamento({quantidade:'1.25', unitario:'100', desconto:'25'});
  r.print();
  assert.match(r.get('pdfTotal').textContent, /100,00/);
});

test('Orçamento: impressão direta revalida alterações sem evento input e nunca reaproveita PDF antigo', () => {
  const r = orcamento({}, 'accepted');
  assert.match(r.get('pdfTotal').textContent, /280,00/);
  r.get('unitario').value = '';
  r.beforePrint();
  assert.equal(r.get('pdfTotal').textContent, '');
  assert.equal(r.get('pdfErro').hidden, false);
  assert.equal(r.get('budgetPaper').classList.contains('budget-invalid'), true);
  assert.equal(r.events.length, 0);
  r.get('unitario').value = '200';
  r.beforePrint();
  assert.match(r.get('pdfTotal').textContent, /580,00/);
  assert.equal(r.get('pdfErro').hidden, true);
  assert.equal(r.get('budgetPaper').classList.contains('budget-invalid'), false);
  r.beforePrint();
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0][1], 'orcamento_impressao_aberta');
  assert.deepEqual(Object.keys(r.events[0][2]), []);
});
