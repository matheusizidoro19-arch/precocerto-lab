const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const tarifas=require('../shopee-taxas.js');
const source=fs.readFileSync(path.join(__dirname,'../shopee-ui.js'),'utf8');

function elemento(value='') {
  const handlers={};
  return {
    value:String(value),textContent:'',hidden:false,disabled:false,
    addEventListener(event,handler){(handlers[event] ||= []).push(handler);},
    fire(event){for(const handler of handlers[event] || [])handler({preventDefault(){}});}
  };
}

function executar(overrides={},consentimento=null) {
  const valores={
    modo:'automatico',perfil:'cnpj',custo:35,embalagem:5,frete:0,
    imposto:0,ads:0,margem:20,'comissao-manual':20,'fixa-manual':4.5,
    'preco-atual':'',...overrides
  };
  const nodes=new Map(Object.entries(valores).map(([id,value])=>['shopee-'+id,elemento(value)]));
  const get=id=>{
    const chave='shopee-'+id;
    if(!nodes.has(chave))nodes.set(chave,elemento());
    return nodes.get(chave);
  };
  const controles=Object.keys(valores).map(get);
  get('manual').querySelectorAll=()=>[get('comissao-manual'),get('fixa-manual')];
  get('form').querySelectorAll=()=>controles;
  const events=[];
  vm.runInNewContext(source,{
    document:{getElementById:id=>get(id.replace(/^shopee-/,''))},
    window:{ShopeeTarifas:tarifas,gtag:(...args)=>events.push(args)},
    localStorage:{getItem:()=>consentimento}
  },{filename:'shopee-ui.js'});
  const alterar=(id,value,event='input')=>{
    get(id).value=String(value);
    get(id).fire(event);
  };
  return {get,alterar,events};
}

test('Shopee UI: controles inativos são desativados na carga e ao alternar, preservando valores',()=>{
  const {get,alterar}=executar({perfil:'cpf_ate_450'});
  assert.equal(get('manual').hidden,true);
  assert.equal(get('comissao-manual').disabled,true);
  assert.equal(get('fixa-manual').disabled,true);
  assert.equal(get('perfil').disabled,false);
  alterar('modo','manual','change');
  assert.equal(get('manual').hidden,false);
  assert.equal(get('comissao-manual').disabled,false);
  assert.equal(get('fixa-manual').disabled,false);
  assert.equal(get('perfil').disabled,true);
  alterar('comissao-manual',100);
  assert.notEqual(get('erro').textContent,'');
  alterar('modo','automatico','change');
  assert.equal(get('comissao-manual').value,'100');
  assert.equal(get('comissao-manual').disabled,true);
  assert.equal(get('fixa-manual').disabled,true);
  assert.equal(get('perfil').disabled,false);
  assert.equal(get('perfil').value,'cpf_ate_450');
  assert.equal(get('erro').textContent,'');
  assert.notEqual(get('preco').textContent,'—');
});

test('Shopee UI: confere preço atual e limpa sugestão antiga quando a margem é inviável',()=>{
  const {get,alterar}=executar({'preco-atual':100});
  assert.notEqual(get('preco').textContent,'—');
  alterar('margem',90);
  assert.equal(get('preco').textContent,'—');
  assert.equal(get('lucro').textContent,'—');
  assert.match(get('erro').textContent,/Não foi possível/);
  assert.equal(get('conferencia').hidden,false);
  assert.match(get('conferencia-texto').textContent,/taxa estimada de R\$\s*34,00/);
  assert.match(get('conferencia-texto').textContent,/lucro aproximado de R\$\s*26,00 \(26%\)/);
  alterar('preco-atual',80);
  assert.match(get('conferencia-texto').textContent,/taxa estimada de R\$\s*27,20/);
  assert.match(get('conferencia-texto').textContent,/lucro aproximado de R\$\s*12,80/);
});

test('Shopee UI: conferir preço não depende do preenchimento da margem desejada',()=>{
  const {get}=executar({margem:'','preco-atual':100});
  assert.match(get('erro').textContent,/campos obrigatórios/);
  assert.equal(get('preco').textContent,'—');
  assert.equal(get('conferencia').hidden,false);
  assert.match(get('conferencia-texto').textContent,/26,00/);
});

test('Shopee UI: falhas não removem avisos de referência não confirmada nem de modo manual',()=>{
  const {get,alterar}=executar({perfil:'cpf_acima_450',margem:90,'preco-atual':100});
  assert.match(get('aviso').textContent,/não foram confirmadas diretamente/);
  assert.match(get('aviso').textContent,/CPF abaixo de R\$ 12,00/);
  assert.match(get('aviso').textContent,/não representa o menor preço possível/);
  alterar('modo','manual','change');
  assert.equal(get('preco').textContent,'—');
  assert.match(get('aviso').textContent,/tarifas informadas por você/);
  assert.match(get('aviso').textContent,/mudam por faixa ou são regressivas/);
  assert.match(get('aviso').textContent,/Não é uma consulta ao seu extrato/);
});

test('Shopee UI: conferência CPF abaixo do limite continua bloqueada sem inventar tarifa',()=>{
  const {get,alterar}=executar({perfil:'cpf_acima_450',margem:90,'preco-atual':11.99});
  assert.equal(get('conferencia').hidden,false);
  assert.match(get('conferencia-texto').textContent,/não foi confirmada/);
  assert.match(get('conferencia-texto').textContent,/modo manual/);
  assert.doesNotMatch(get('conferencia-texto').textContent,/taxa estimada de/);
  alterar('modo','manual','change');
  assert.match(get('conferencia-texto').textContent,/taxa estimada de/);
});

test('Shopee UI: limpar ou invalidar o preço atual não mantém uma comparação anterior visível',()=>{
  const {get,alterar}=executar({'preco-atual':100});
  alterar('preco-atual',0);
  assert.equal(get('conferencia').hidden,false);
  assert.match(get('conferencia-texto').textContent,/preço de venda válido/);
  assert.doesNotMatch(get('conferencia-texto').textContent,/26,00/);
  assert.equal(get('erro').textContent,'');
  alterar('preco-atual','');
  assert.equal(get('conferencia').hidden,true);
  alterar('preco-atual',100);
  alterar('custo','');
  assert.equal(get('conferencia').hidden,true);
  assert.equal(get('preco').textContent,'—');
});

test('Shopee UI: evento existente mantém consentimento e não inclui os dados digitados',()=>{
  const semConsentimento=executar({'preco-atual':100});
  semConsentimento.get('form').fire('submit');
  assert.equal(semConsentimento.events.length,0);
  const comConsentimento=executar({'preco-atual':100},'accepted');
  comConsentimento.get('form').fire('submit');
  assert.equal(comConsentimento.events.length,1);
  assert.equal(JSON.stringify(comConsentimento.events[0]),JSON.stringify(['event','calculo_concluido',{ferramenta:'shopee_tarifas'}]));
});
