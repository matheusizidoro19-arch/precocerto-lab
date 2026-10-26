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

function conferirValores(r, subtotal, desconto, total) {
  const texto = valor => 'R$\u00a0' + valor;
  assert.equal(r.get('pdfSubtotal').textContent, texto(subtotal));
  assert.equal(r.get('pdfBruto').textContent, texto(subtotal));
  assert.equal(r.get('pdfDesconto').textContent, texto(desconto));
  assert.equal(r.get('pdfTotal').textContent, texto(total));
  assert.equal(r.get('total').textContent, texto(total));
  assert.ok(r.get('resumo').textContent.includes('Desconto: ' + texto(desconto)));
  assert.ok(r.get('resumo').textContent.includes('Preço unitário: ' + r.get('pdfUnitario').textContent));
  assert.equal(r.get('budgetError').textContent, '');
  assert.equal(r.get('pdfErro').hidden, true);
  const centavos = valor => BigInt(valor.replace(/[.,]/g, ''));
  assert.equal(centavos(subtotal) - centavos(desconto), centavos(total));
}

test('Orçamento: subtotal fracionário usa arredondamento comercial antes do desconto', () => {
  const casos = [
    ['0.29', '0.10', '0.03', '0,03', '0,03', '0,00'],
    ['0.07', '0.10', '0.01', '0,01', '0,01', '0,00'],
    ['0.29', '100', '29', '29,00', '29,00', '0,00'],
    ['0.14', '0.10', '0', '0,01', '0,00', '0,01'],
    ['0.15', '0.10', '0', '0,02', '0,00', '0,02'],
    ['0.16', '0.10', '0', '0,02', '0,00', '0,02'],
    ['0.29', '0.50', '0', '0,15', '0,00', '0,15'],
    ['0.29', '0.50', '0.15', '0,15', '0,15', '0,00'],
    ['0.15', '0.10', '0.01', '0,02', '0,01', '0,01'],
    ['1.25', '0.10', '0', '0,13', '0,00', '0,13'],
    ['0.01', '0.49', '0', '0,00', '0,00', '0,00'],
    ['0.01', '0.50', '0.01', '0,01', '0,01', '0,00'],
    ['3', '100', '20', '300,00', '20,00', '280,00'],
    ['1.25', '100', '25', '125,00', '25,00', '100,00'],
    ['1', '0', '0', '0,00', '0,00', '0,00']
  ];
  for (const [quantidade, unitario, desconto, subtotal, abatimento, total] of casos) {
    const r = orcamento({quantidade, unitario, desconto});
    conferirValores(r, subtotal, abatimento, total);
    r.print();
    assert.equal(r.prints(), 1);
    conferirValores(r, subtotal, abatimento, total);
  }
});

test('Orçamento: desconto acima do subtotal arredondado limpa documento e bloqueia impressão', () => {
  for (const [quantidade, unitario, desconto] of [['0.29', '0.10', '0.04'], ['0.01', '0.49', '0.01'], ['0.29', '0.50', '0.16']]) {
    const r = orcamento();
    r.get('quantidade').value = quantidade;
    r.get('unitario').value = unitario;
    r.get('desconto').value = desconto;
    r.print();
    assert.equal(r.prints(), 0);
    assert.equal(r.get('budgetError').textContent, 'O desconto não pode superar o subtotal.');
    assert.equal(r.get('total').textContent, '—');
    for (const id of ['pdfSubtotal', 'pdfBruto', 'pdfDesconto', 'pdfTotal']) assert.equal(r.get(id).textContent, '');
    assert.equal(r.get('budgetPaper').classList.contains('budget-invalid'), true);
  }
});

test('Orçamento: valores próximos ao limite preservam centavos e rejeitam subtotal acima do limite', () => {
  const r = orcamento({quantidade:'1000000', unitario:'90071992.54', desconto:'0.01'});
  r.print();
  assert.equal(r.prints(), 1);
  conferirValores(r, '90.071.992.540.000,00', '0,01', '90.071.992.539.999,99');
  r.get('unitario').value = '90071992.55';
  r.beforePrint();
  assert.equal(r.get('budgetError').textContent, 'Os números informados são muito altos. Confira os valores.');
  assert.equal(r.get('pdfTotal').textContent, '');
  assert.equal(r.get('total').textContent, '—');
  r.print();
  assert.equal(r.prints(), 1);
});

test('Orçamento: input, envio e impressão direta mantêm a mesma regra monetária', () => {
  const r = orcamento();
  r.get('quantidade').value = '0.15';
  r.get('unitario').value = '0.10';
  r.get('desconto').value = '0.01';
  r.get('desconto').fire('input');
  conferirValores(r, '0,02', '0,01', '0,01');
  r.get('budget').fire('submit');
  conferirValores(r, '0,02', '0,01', '0,01');
  r.get('desconto').value = '0.02';
  r.beforePrint();
  conferirValores(r, '0,02', '0,02', '0,00');
  assert.equal(r.prints(), 0);
  assert.equal(r.events.length, 0);
});

test('Orçamento: entradas monetárias próximas ao limite preservam cada centavo digitado', () => {
  for (const final of ['89', '90', '91']) {
    const r = orcamento({quantidade:'1', unitario:'90071992547409.'+final, desconto:'0'});
    r.print();
    assert.equal(r.prints(), 1);
    const esperado = '90.071.992.547.409,'+final;
    conferirValores(r, esperado, '0,00', esperado);
    assert.equal(r.get('pdfUnitario').textContent, 'R$\u00a0'+esperado);
  }
  const r = orcamento({quantidade:'1', unitario:'90071992547409.91', desconto:'90071992547409.90'});
  conferirValores(r, '90.071.992.547.409,91', '90.071.992.547.409,90', '0,01');
  r.get('desconto').value = '90071992547409.91';
  r.beforePrint();
  conferirValores(r, '90.071.992.547.409,91', '90.071.992.547.409,91', '0,00');
});

test('Orçamento: quantidade no limite mantém precisão no resumo e na impressão', () => {
  const r = orcamento({quantidade:'90071992547409.91', unitario:'1', desconto:'0'});
  r.print();
  assert.equal(r.prints(), 1);
  conferirValores(r, '90.071.992.547.409,91', '0,00', '90.071.992.547.409,91');
  assert.ok(r.get('resumo').textContent.includes('Quantidade: 90071992547409.91'));
  assert.equal(r.get('pdfQuantidade').textContent, '90071992547409,91');
});

test('Orçamento: limites e casas decimais são validados sem aproximação binária', () => {
  for (const campo of ['quantidade', 'unitario', 'desconto']) {
    for (const value of ['90071992547409.92', '1.00000000000000001', '0.001', '1e1000000', '1e-1000000']) {
      const r = orcamento();
      r.get(campo).value = value;
      r.beforePrint();
      assert.equal(r.get('pdfTotal').textContent, '', campo+': '+value);
      assert.equal(r.get('total').textContent, '—');
      assert.equal(r.get('budgetPaper').classList.contains('budget-invalid'), true);
      r.print();
      assert.equal(r.prints(), 0);
    }
  }
});

test('Orçamento: decimais equivalentes e notação científica preservam valores exatos', () => {
  for (const [quantidade, unitario, desconto] of [
    ['1.5e-1', '1e-1', '1e-2'],
    ['0.1500', '0.1000', '0.0100'],
    ['.15', '.10', '.01'],
    ['15e-2', '10e-2', '10e-3']
  ]) {
    const r = orcamento({quantidade, unitario, desconto});
    r.print();
    assert.equal(r.prints(), 1);
    conferirValores(r, '0,02', '0,01', '0,01');
    assert.equal(r.get('pdfQuantidade').textContent, '0,15');
  }
});

test('Orçamento: sintaxe inválida e números negativos continuam bloqueando impressão', () => {
  for (const campo of ['quantidade', 'unitario', 'desconto']) {
    for (const value of ['', '   ', 'NaN', 'Infinity', '-Infinity', '-0.01', '1e', '1.2.3', 'abc']) {
      const r = orcamento({[campo]:value});
      r.print();
      assert.equal(r.prints(), 0, campo+': '+value);
      assert.equal(r.get('pdfTotal').textContent, '');
      assert.equal(r.get('total').textContent, '—');
    }
  }
});
