const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');

function element(value = '') {
  const handlers = {};
  const classes = new Set();
  return {
    value: String(value), textContent: '', checked: false,
    classList: {
      toggle(k, on) { if (on) classes.add(k); else classes.delete(k); },
      add(k) { classes.add(k); },
      remove(...keys) { keys.forEach(k => classes.delete(k)); },
      contains(k) { return classes.has(k); }
    },
    addEventListener(k, fn) { (handlers[k] ||= []).push(fn); },
    fire(k) { (handlers[k] || []).forEach(fn => fn({ preventDefault() {} })); }
  };
}
function runApp(values, kind, budget = false) {
  const map = new Map(Object.entries(values).map(([k,v]) => [k, element(v)]));
  const form = element();
  form.dataset = { kind };
  form.querySelectorAll = () => Object.keys(values).map(k => map.get(k));
  map.set(budget ? 'budget' : 'calculator', form);
  const get = id => {
    if ((id === 'calculator' || id === 'budget') && !map.has(id)) return null;
    if (!map.has(id)) map.set(id, element());
    return map.get(id);
  };
  get('printBudget');
  const events = [];
  const sandbox = {
    document: { getElementById: get },
    window: { gtag: (...args) => events.push(args), addEventListener() {}, print() {} },
    localStorage: { getItem: () => null }, Date, console
  };
  vm.runInNewContext(source('app.js'), sandbox, { filename: 'app.js' });
  return { get, events };
}
const marketplace = { produto:35, embalagem:5, frete:0, tarifaFixa:4, comissao:15, imposto:0, margem:20 };

test('Margem: preço e lucro sobre valor de venda', () => {
  const e = runApp({custoBase:50,taxas:10,margem:25}, 'margem');
  assert.match(e.get('preco').textContent, /76,92/);
  assert.match(e.get('lucro').textContent, /19,23/);
});
test('Margem: 100% de taxas e lucro é inválido e limpa resultado', () => {
  const e = runApp({custoBase:50,taxas:10,margem:25}, 'margem');
  e.get('margem').value='90'; e.get('margem').fire('input');
  assert.equal(e.get('preco').textContent,'—');
  assert.match(e.get('erro').textContent, /menor que 100%/);
});
test('Impressão 3D: custos de filamento, energia e máquina', () => {
  const e = runApp({filamento:90,gramas:80,watts:120,horas:4,tarifa:0.95,maquina:2,extras:3,taxas:10,margem:25},'impressao');
  assert.match(e.get('material').textContent,/7,20/);
  assert.match(e.get('energia').textContent,/0,46/);
  assert.match(e.get('preco').textContent,/28,70/);
});
test('Marketplace: custos, taxas e margem', () => {
  const e=runApp(marketplace,'marketplace');
  assert.match(e.get('preco').textContent,/67,69/);
  assert.match(e.get('custo').textContent,/44,00/);
  assert.match(e.get('taxaFinal').textContent,/10,15/);
  assert.match(e.get('lucro').textContent,/13,54/);
});
test('Marketplace: entrada vazia ou negativa limpa cálculo antigo', () => {
  const e=runApp(marketplace,'marketplace');
  for(const value of ['-4','']) {
    e.get('produto').value=value;
    e.get('produto').fire('input');
    assert.equal(e.get('preco').textContent,'—');
  }
});
test('Orçamento: subtotal, desconto e total', () => {
  const e=runApp({quantidade:3,unitario:40,desconto:10,empresa:'Teste',cliente:'Exemplo',servico:'Serviço',observacoes:''},undefined,true);
  assert.match(e.get('pdfSubtotal').textContent,/120,00/);
  assert.match(e.get('pdfTotal').textContent,/110,00/);
  assert.equal(e.get('pdfCliente').textContent,'Exemplo');
  assert.equal(e.events.length,0);
});
test('Orçamento: desconto maior que subtotal é recusado', () => {
  const e=runApp({quantidade:3,unitario:40,desconto:10,empresa:'Teste',cliente:'Exemplo',servico:'Serviço',observacoes:''},undefined,true);
  e.get('desconto').value='121'; e.get('desconto').fire('input');
  assert.equal(e.get('total').textContent,'—');
  assert.match(e.get('budgetError').textContent,/desconto/i);
});
function runSimulator(overrides={}) {
  const inline = [...source('marketplace.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(x=>x[1]).find(x=>x.includes('const sync = $("risco-automatico")'));
  assert.ok(inline,'Simulador deve existir');
  const nodes=new Map();
  const get = id => {
    if(!nodes.has(id)) nodes.set(id,element());
    return nodes.get(id);
  };
  const data={...marketplace,'risco-preco':67.69,'risco-desconto':10,'risco-anuncios':3,'risco-extra':3,...overrides};
  Object.entries(data).forEach(([k,v])=>get(k).value=String(v));
  get('risco-automatico').checked=true;
  vm.runInNewContext(inline,{document:{getElementById:get},localStorage:{getItem:()=>null},window:{},setTimeout});
  return {get};
}
test('Resistência do lucro: anúncio, desconto e custos extras', () => {
  const {get}=runSimulator();
  assert.equal(get('risco-preco').value,'67.69');
  assert.match(get('risco-crit-lucro').textContent,/2,96/);
  assert.match(get('risco-base-lucro').textContent,/13,54/);
});
test('Resistência do lucro: cenário com prejuízo gera alerta', () => {
  const {get}=runSimulator({'risco-anuncios':20,'risco-extra':10});
  assert.ok(get('risco-row-critico').classList.contains('risco-negativo'));
  assert.match(get('risco-estado').textContent,/prejuízo/);
});
test('Resistência do lucro: desconto de 100% não é permitido', () => {
  const {get}=runSimulator();
  get('risco-desconto').value='100';get('risco-desconto').fire('input');
  assert.equal(get('risco-lucro').textContent,'—');
});
test('SEO: todas as URLs declaradas têm arquivo, título, H1 e canonical', () => {
  const urls=[...source('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
  assert.equal(urls.length,14);
  for(const url of urls){
    assert.ok(url.startsWith('https://lucronoazul.com.br/'));
    const p = new URL(url).pathname;
    const html=source(p==='/'?'index.html':p.slice(1));
    assert.match(html,/<title>[^<]+<\/title>/i);
    assert.match(html,/<h1\b/i);
    assert.ok(html.includes(url));
  }
});
test('Referências locais das páginas apontam para arquivos existentes', () => {
  for(const page of fs.readdirSync(root).filter(x=>x.endsWith('.html'))) {
    for(const match of source(page).matchAll(/(?:href|src)=["']([^"']+)["']/g)){
      const url=match[1];
      if(/^(https?:|mailto:|tel:|#|data:|\/\/)/i.test(url)) continue;
      const local=decodeURIComponent(url.split(/[?#]/)[0]);
      if(local) assert.ok(fs.existsSync(path.join(root,local)),page+': '+url);
    }
  }
});
