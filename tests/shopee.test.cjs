const test=require('node:test');
const assert=require('node:assert/strict');
const {calcularTarifa,calcularPreco,conferirPreco,VIGENCIA}=require('../shopee-taxas.js');
const config=(extra={})=>({perfil:'cnpj',custoCentavos:4000,impostoPercentual:0,anuncioPercentual:0,margemPercentual:20,modo:'automatico',percentualManual:0,fixaManualCentavos:0,...extra});
test('data de vigência de referência registrada',()=>assert.equal(VIGENCIA,'2026-10-01'));
test('CNPJ abaixo de nove reais usa metade do preço como parcela fixa',()=>{
  const t=calcularTarifa(800,'cnpj');assert.equal(t.percentualCentavos,160);assert.equal(t.fixoCentavos,400);assert.equal(t.totalCentavos,560);
});
test('faixa de R$ 9 a R$ 79,99',()=>{
  const t=calcularTarifa(7999,'cnpj');assert.equal(t.percentual,20);assert.equal(t.fixoCentavos,450);
});
test('faixa de R$ 80 muda percentual e parcela fixa',()=>{
  const t=calcularTarifa(8000,'cnpj');assert.equal(t.percentual,14);assert.equal(t.fixoCentavos,1600);
});
test('faixas de R$ 100 e R$ 200',()=>{
  assert.equal(calcularTarifa(10000,'cnpj').fixoCentavos,2000);
  assert.equal(calcularTarifa(20000,'cnpj').fixoCentavos,2600);
});
test('MEI e CNPJ não recebem adicional para CPF',()=>assert.equal(calcularTarifa(8000,'cnpj').adicionalCpfCentavos,0));
test('CPF mais de 450 recebe adicional de três reais',()=>assert.equal(calcularTarifa(1200,'cpf_acima_450').adicionalCpfCentavos,300));
test('CPF com até 450 não recebe adicional',()=>assert.equal(calcularTarifa(1200,'cpf_ate_450').adicionalCpfCentavos,0));
test('CPF abaixo de R$ 12 não recebe valores automáticos não confirmados',()=>{
  assert.equal(calcularTarifa(1199,'cpf_ate_450'),null);assert.equal(calcularTarifa(800,'cpf_acima_450'),null);
});
test('preço mínimo satisfaz margem e considera os degraus de tarifa',()=>{
 const cfg=config({custoCentavos:4000});const r=calcularPreco(cfg);
 assert.ok(r.lucroCentavos*100>=r.precoCentavos*20);
 const menor=r.precoCentavos-1;
 if(menor>0){const e=conferirPreco(cfg,menor);assert.ok(e.lucroCentavos*100<menor*20);}
});
test('cenário com custo alto encontra faixa a partir de R$ 200',()=>{
 const r=calcularPreco(config({custoCentavos:18000}));
 assert.ok(r.precoCentavos>=20000);assert.equal(r.tarifa.fixoCentavos,2600);
});
test('cálculo CPF acima do limite incorpora custo adicional',()=>{
 const c=config({perfil:'cpf_acima_450',custoCentavos:4000});const r=calcularPreco(c);
 assert.equal(r.tarifa.adicionalCpfCentavos,300);
 assert.ok(r.precoCentavos>=1200);
});
test('modo manual usa tarifa informada sem adicional CPF',()=>{
 const r=calcularPreco(config({modo:'manual',percentualManual:15,fixaManualCentavos:400,perfil:'cpf_acima_450'}));
 assert.equal(r.tarifa.percentual,15);assert.equal(r.tarifa.fixoCentavos,400);assert.equal(r.tarifa.adicionalCpfCentavos,0);
});
test('preço atual exibe lucro estimado depois das tarifas',()=>{
 const r=conferirPreco(config(),7999);assert.equal(r.tarifa.fixoCentavos,450);assert.equal(r.lucroCentavos,7999-4000-1600-450);
});
test('validação impede margem inválida e valores não finitos',()=>{
 assert.throws(()=>calcularPreco(config({margemPercentual:100})),/percentuais/);
 assert.throws(()=>calcularPreco(config({custoCentavos:Infinity})),/custos/);
});

test('limites de R$ 8,99 e R$ 9,00 aplicam tarifa CNPJ',()=>{
  const a=calcularTarifa(899,'cnpj'), b=calcularTarifa(900,'cnpj');
  assert.equal(a.percentual,20); assert.equal(a.fixoCentavos,450);
  assert.equal(b.fixoCentavos,450); assert.equal(b.totalCentavos,630);
});
test('quebras exatas de tarifas nas faixas',()=>{
  for(const [p,rate,fixa] of [[7999,20,450],[8000,14,1600],[9999,14,1600],[10000,14,2000],[19999,14,2000],[20000,14,2600]]){
    const t=calcularTarifa(p,'cnpj'); assert.equal(t.percentual,rate);assert.equal(t.fixoCentavos,fixa);
  }
});
test('CPF: bloqueio abaixo de doze reais e adicional conforme pedidos',()=>{
  assert.equal(calcularTarifa(1199,'cpf_ate_450'),null);
  assert.equal(calcularTarifa(1199,'cpf_acima_450'),null);
  assert.equal(calcularTarifa(1200,'cpf_ate_450').totalCentavos,690);
  assert.equal(calcularTarifa(1200,'cpf_acima_450').totalCentavos,990);
});
test('conferência no preço real muda taxa quando ultrapassa a faixa',()=>{
  const cfg=config({custoCentavos:3000});
  const antes=conferirPreco(cfg,7999),depois=conferirPreco(cfg,8000);
  assert.equal(antes.tarifa.totalCentavos,2050);
  assert.equal(depois.tarifa.totalCentavos,2720);
  assert.equal(antes.lucroCentavos,7999-3000-2050);
  assert.equal(depois.lucroCentavos,8000-3000-2720);
});
test('CPF: alerta explicita limite da tarifa não conhecida',()=>{
  const r=calcularPreco(config({perfil:'cpf_ate_450',custoCentavos:100}));
  assert.ok(r.precoCentavos>=1200);
  assert.match(r.aviso,/abaixo de R\$ 12/);
});

function referenciaIndependente(cfg, preco) {
  if (cfg.modo !== 'manual' && cfg.perfil !== 'cnpj' && preco < 1200) return null;
  const p = BigInt(preco);
  const pontos = valor => BigInt(Math.round(valor * 100));
  const parcela = taxa => (p * pontos(taxa) + 5000n) / 10000n;
  let comissao, fixa;
  if (cfg.modo === 'manual') {
    comissao = cfg.percentualManual;
    fixa = BigInt(cfg.fixaManualCentavos);
  } else if (preco < 900) {
    comissao = 20;
    fixa = (p + 1n) / 2n;
  } else if (preco < 8000) {
    comissao = 20;
    fixa = 450n;
  } else {
    comissao = 14;
    fixa = preco < 10000 ? 1600n : preco < 20000 ? 2000n : 2600n;
  }
  const adicional = cfg.modo !== 'manual' && cfg.perfil === 'cpf_acima_450' ? 300n : 0n;
  const lucro = p - BigInt(cfg.custoCentavos) - parcela(comissao) - fixa - adicional - parcela(cfg.impostoPercentual) - parcela(cfg.anuncioPercentual);
  return { lucro, atende: lucro * 10000n >= p * pontos(cfg.margemPercentual) };
}

function minimoExaustivo(cfg, limite) {
  for (let preco = 1; preco <= limite; preco++) {
    if (referenciaIndependente(cfg, preco)?.atende) return preco;
  }
  return null;
}

function compararComBuscaExaustiva(cfg, limite) {
  const esperado = minimoExaustivo(cfg, limite);
  let resultado;
  try {
    resultado = calcularPreco(cfg);
  } catch (erro) {
    assert.equal(esperado, null, JSON.stringify(cfg));
    assert.match(erro.message, /Não foi possível/);
    return;
  }
  assert.ok(referenciaIndependente(cfg, resultado.precoCentavos).atende, JSON.stringify(cfg));
  assert.equal(BigInt(resultado.lucroCentavos), referenciaIndependente(cfg, resultado.precoCentavos).lucro);
  if (esperado === null) assert.ok(resultado.precoCentavos > limite, JSON.stringify(cfg));
  else assert.equal(resultado.precoCentavos, esperado, JSON.stringify(cfg));
}

test('regressão R$ 36,26: mínimo real é R$ 36,24, sem arredondar a margem para baixo', () => {
  const cfg = config({ custoCentavos: 1000, impostoPercentual: 10, anuncioPercentual: 10 });
  const resultado = calcularPreco(cfg);
  assert.equal(resultado.precoCentavos, 3624);
  assert.ok(resultado.margemEfetiva >= 20);
  compararComBuscaExaustiva(cfg, 4000);
});

test('regressão R$ 4.140,86: custo zero e comissão/margem de 50% têm mínimo de dois centavos', () => {
  const cfg = config({ modo: 'manual', custoCentavos: 0, percentualManual: 50, margemPercentual: 50 });
  assert.equal(calcularPreco(cfg).precoCentavos, 2);
  compararComBuscaExaustiva(cfg, 100);
});

test('margem padrão de 20% exige R$ 74,17 e custo zero não permite lucro zero com margem positiva', () => {
  assert.equal(calcularPreco(config()).precoCentavos, 7417);
  const cfg = config({ custoCentavos: 0 });
  const resultado = calcularPreco(cfg);
  assert.ok(resultado.margemEfetiva >= 20);
  compararComBuscaExaustiva(cfg, 100);
});

test('busca exaustiva independente cobre todas as faixas e perfis', () => {
  for (const perfil of ['cnpj', 'cpf_ate_450', 'cpf_acima_450']) {
    for (const custoCentavos of [0, 50, 1000, 4000, 4400, 4900, 5800, 7000, 12000, 15000]) {
      compararComBuscaExaustiva(config({ perfil, custoCentavos }), 30000);
    }
  }
});

test('busca exaustiva independente cobre percentuais decimais e sequências não monotônicas', () => {
  let estado = 20261018;
  const proximo = limite => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado % limite;
  };
  for (let i = 0; i < 80; i++) {
    compararComBuscaExaustiva(config({
      modo: 'manual', custoCentavos: proximo(150), fixaManualCentavos: proximo(100),
      percentualManual: proximo(6000) / 100, impostoPercentual: proximo(1500) / 100,
      anuncioPercentual: proximo(1000) / 100, margemPercentual: proximo(5000) / 100
    }), 2500);
  }
});

test('perfis automáticos com encargos decimais coincidem com a busca exaustiva', () => {
  for (const [perfil, esperado] of [['cnpj', 7464], ['cpf_ate_450', 7464], ['cpf_acima_450', 7966]]) {
    const cfg = config({ perfil, impostoPercentual: 0.07, anuncioPercentual: 0.29, margemPercentual: 20.01 });
    assert.equal(calcularPreco(cfg).precoCentavos, esperado);
    compararComBuscaExaustiva(cfg, 10000);
  }
});

test('busca considera soluções de arredondamento mesmo com soma percentual de 100% ou mais', () => {
  const casos = [
    { percentualManual: 34, impostoPercentual: 34, anuncioPercentual: 34, margemPercentual: 99.99, esperado: 1 },
    { percentualManual: 50, impostoPercentual: 50, anuncioPercentual: 0.01, margemPercentual: 0, esperado: 2 },
    { percentualManual: 99.99, impostoPercentual: 0, anuncioPercentual: 0, margemPercentual: 0, custoCentavos: 1, esperado: 5001 }
  ];
  for (const { esperado, ...extra } of casos) {
    const cfg = config({ modo: 'manual', custoCentavos: 0, ...extra });
    assert.equal(calcularPreco(cfg).precoCentavos, esperado);
    compararComBuscaExaustiva(cfg, 6000);
  }
  assert.throws(() => calcularPreco(config({ modo: 'manual', custoCentavos: 1, percentualManual: 50, margemPercentual: 50 })), /Não foi possível/);
});

test('limite de busca inclui R$ 1 milhão e rejeita solução além dele', () => {
  const cfg = config({ modo: 'manual', custoCentavos: 100000000, percentualManual: 0, margemPercentual: 0 });
  assert.equal(calcularPreco(cfg).precoCentavos, 100000000);
  assert.throws(() => calcularPreco({ ...cfg, fixaManualCentavos: 1 }), /Não foi possível/);
  assert.equal(calcularPreco(config({ modo: 'manual', custoCentavos: 10000, percentualManual: 99.99, margemPercentual: 0 })).precoCentavos, 99995001);
});

test('percentuais aceitam centésimos sem ruído binário e rejeitam precisão não suportada', () => {
  for (const percentualManual of [0.07, 0.29, 33.33, 99.99]) {
    compararComBuscaExaustiva(config({ modo: 'manual', custoCentavos: 1, percentualManual, margemPercentual: 0 }), 6000);
  }
  for (const campo of ['impostoPercentual', 'anuncioPercentual', 'margemPercentual', 'percentualManual']) {
    assert.throws(() => calcularPreco(config({ modo: 'manual', [campo]: 0.001 })), /duas casas/);
  }
});

test('conferência funciona sem sugestão viável, margem válida ou margem preenchida', () => {
  for (const margemPercentual of [90, 100, NaN, undefined]) {
    const cfg = config({ margemPercentual });
    assert.throws(() => calcularPreco(cfg));
    const resultado = conferirPreco(cfg, 10000);
    assert.equal(resultado.tarifa.totalCentavos, 3400);
    assert.equal(resultado.lucroCentavos, 2600);
    assert.equal(resultado.margemEfetiva, 26);
    assert.equal(Object.hasOwn(resultado, 'referencia'), false);
  }
});

test('conferência preserva prejuízo, modo manual e bloqueio de CPF abaixo de R$ 12', () => {
  assert.equal(conferirPreco(config({ margemPercentual: 90 }), 1200).lucroCentavos, -3490);
  assert.equal(conferirPreco(config({ modo: 'manual', percentualManual: 15, fixaManualCentavos: 400, margemPercentual: 99.99 }), 10000).lucroCentavos, 4100);
  assert.throws(() => conferirPreco(config({ perfil: 'cpf_ate_450', margemPercentual: 90 }), 1199), /não foi confirmada/);
  assert.throws(() => conferirPreco(config({ custoCentavos: NaN }), 10000), /custos/);
  assert.throws(() => conferirPreco(config({ impostoPercentual: Infinity }), 10000), /percentuais/);
  assert.throws(() => conferirPreco(config(), 0), /preço de venda válido/);
  assert.throws(() => conferirPreco(config({ modo: 'manual', fixaManualCentavos: 1e20 }), 10000), /tarifa manual/);
});

test('cada perfil confere os centavos antes, no limite e depois de R$ 9, 12, 80, 100 e 200', () => {
  const valoresCnpj = [
    [899, 630], [900, 630], [901, 630],
    [1199, 690], [1200, 690], [1201, 690],
    [7999, 2050], [8000, 2720], [8001, 2720],
    [9999, 3000], [10000, 3400], [10001, 3400],
    [19999, 4800], [20000, 5400], [20001, 5400]
  ];
  for (const perfil of ['cnpj', 'cpf_ate_450', 'cpf_acima_450']) {
    const cfg = config({ perfil, impostoPercentual: 12.34, anuncioPercentual: 0.07 });
    for (const [preco, tarifaCnpj] of valoresCnpj) {
      const contexto = JSON.stringify({ perfil, preco });
      if (perfil !== 'cnpj' && preco < 1200) {
        assert.equal(calcularTarifa(preco, perfil), null, contexto);
        assert.throws(() => conferirPreco(cfg, preco), /não foi confirmada/, contexto);
        continue;
      }
      const resultado = conferirPreco(cfg, preco);
      assert.equal(resultado.tarifa.totalCentavos, tarifaCnpj + (perfil === 'cpf_acima_450' ? 300 : 0), contexto);
      assert.equal(BigInt(resultado.lucroCentavos), referenciaIndependente(cfg, preco).lucro, contexto);
    }
  }
});

test('mínimos próximos das transições são globais pela busca exaustiva independente', () => {
  for (const perfil of ['cnpj', 'cpf_ate_450', 'cpf_acima_450']) {
    for (const limite of [900, 1200, 8000, 10000, 20000]) {
      const cfg = config({ perfil, custoCentavos: 0, impostoPercentual: 0.07, anuncioPercentual: 0.29 });
      const antes = referenciaIndependente(cfg, limite - 1);
      if (!antes) continue;
      const custoLimite = Number((antes.lucro * 10000n - BigInt(limite - 1) * 2000n) / 10000n);
      for (const ajuste of [-1, 0, 1]) {
        if (custoLimite + ajuste < 0) continue;
        compararComBuscaExaustiva({ ...cfg, custoCentavos: custoLimite + ajuste }, 30000);
      }
    }
  }
});

test('custos elevados e arredondamentos permanecem exatos perto do limite de R$ 1 milhão', () => {
  for (const perfil of ['cnpj', 'cpf_ate_450', 'cpf_acima_450']) {
    const cfg = config({ perfil, custoCentavos: 85000000, impostoPercentual: 0.07, anuncioPercentual: 0.29, margemPercentual: 0.11 });
    const fixos = BigInt(cfg.custoCentavos + 2600 + (perfil === 'cpf_acima_450' ? 300 : 0));
    const denominador = 8553n;
    const numerador = fixos * 10000n - 3n * 5000n;
    const inicio = Number((numerador + denominador - 1n) / denominador);
    let esperado = null;
    for (let preco = inicio; preco <= 100000000; preco++) {
      if (referenciaIndependente(cfg, preco).atende) {
        esperado = preco;
        break;
      }
    }
    assert.notEqual(esperado, null);
    const resultado = calcularPreco(cfg);
    assert.equal(resultado.precoCentavos, esperado);
    assert.equal(BigInt(resultado.lucroCentavos), referenciaIndependente(cfg, esperado).lucro);
    assert.throws(() => calcularPreco(config({ perfil, custoCentavos: 86000000, margemPercentual: 0 })), /Não foi possível/);
  }
  const manual = config({ modo: 'manual', custoCentavos: 50000000, fixaManualCentavos: 49999999, margemPercentual: 0 });
  assert.equal(calcularPreco(manual).precoCentavos, 99999999);
  assert.equal(conferirPreco(manual, 100000000).lucroCentavos, 1);
  assert.throws(() => calcularPreco({ ...manual, fixaManualCentavos: 50000001 }), /Não foi possível/);
});

test('a margem 19,994148% é rejeitada explicitamente, sem arredondamento silencioso', () => {
  const cfg = config({ custoCentavos: 1000, impostoPercentual: 10, anuncioPercentual: 10, margemPercentual: 19.994148 });
  assert.throws(() => calcularPreco(cfg), /até duas casas decimais/);
  const observado = conferirPreco(cfg, 3626);
  assert.equal(observado.lucroCentavos, 725);
  assert.ok(Math.abs(observado.margemEfetiva - 19.99448428019857) < 1e-12);
  const minimo = calcularPreco({ ...cfg, margemPercentual: 20 });
  assert.equal(minimo.precoCentavos, 3624);
  assert.ok(referenciaIndependente({ ...cfg, margemPercentual: 20 }, minimo.precoCentavos).atende);
});
