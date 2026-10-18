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
 assert.ok(r.lucroCentavos>=Math.round(r.precoCentavos*.2));
 const menor=r.precoCentavos-1;
 if(menor>0){const e=conferirPreco(cfg,menor);assert.ok(e.lucroCentavos<Math.round(menor*.2));}
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
