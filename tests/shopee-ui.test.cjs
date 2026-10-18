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
  assert.match(get('conferencia-texto').textContent,/lucro líquido estimado de R\$\s*26,00 \(margem efetiva de 26%\)/);
  alterar('preco-atual',80);
  assert.match(get('conferencia-texto').textContent,/taxa estimada de R\$\s*27,20/);
  assert.match(get('conferencia-texto').textContent,/lucro líquido estimado de R\$\s*12,80/);
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

test('Shopee UI: valores monetários inválidos limpam resultados sem arredondar frações de centavo',()=>{
  for(const campo of ['custo','embalagem','frete','fixa-manual']) {
    for(const valor of ['',-1,'Infinity','-Infinity','NaN','0.001','1.005','0.009','1e100']) {
      const {get,alterar}=executar({modo:'manual','preco-atual':100});
      assert.notEqual(get('preco').textContent,'—');
      alterar(campo,valor);
      assert.equal(get('preco').textContent,'—',`${campo}: ${valor}`);
      assert.equal(get('lucro').textContent,'—',`${campo}: ${valor}`);
      assert.equal(get('conferencia').hidden,true,`${campo}: ${valor}`);
      assert.notEqual(get('erro').textContent,'',`${campo}: ${valor}`);
      if(['0.001','1.005','0.009','1e100'].includes(valor)) assert.match(get('erro').textContent,/valores monetários válidos, com até duas casas/);
      alterar(campo,'0.29');
      assert.equal(get('erro').textContent,'',`${campo}: recuperação após ${valor}`);
      assert.notEqual(get('preco').textContent,'—',`${campo}: recuperação após ${valor}`);
      assert.equal(get('conferencia').hidden,false,`${campo}: recuperação após ${valor}`);
    }
  }
});

test('Shopee UI: valores de 0,07 e 0,29 são aceitos sem ruído binário e formatados em reais',()=>{
  const {get}=executar({modo:'manual',custo:'0.07',embalagem:'0.29',frete:0,margem:0,'comissao-manual':0,'fixa-manual':'0.29','preco-atual':'0.65'});
  assert.equal(get('erro').textContent,'');
  assert.match(get('preco').textContent,/^R\$\s*0,65$/);
  assert.match(get('custo-total').textContent,/^R\$\s*0,36$/);
  assert.match(get('fixa').textContent,/^R\$\s*0,29$/);
  assert.match(get('lucro').textContent,/^R\$\s*0,00$/);
  assert.match(get('conferencia-texto').textContent,/No preço de R\$\s*0,65/);
  assert.match(get('conferencia-texto').textContent,/lucro líquido estimado de R\$\s*0,00/);
});

test('Shopee UI: erro no preço atual não impede sugestão nem mantém comparação anterior',()=>{
  const {get,alterar}=executar({'preco-atual':100});
  const preco=get('preco').textContent;
  for(const valor of [-1,'Infinity','NaN','0.001','100.005','1e100']) {
    alterar('preco-atual',valor);
    assert.equal(get('preco').textContent,preco,`${valor}: sugestão independente`);
    assert.equal(get('erro').textContent,'');
    assert.equal(get('conferencia').hidden,false);
    assert.doesNotMatch(get('conferencia-texto').textContent,/taxa estimada de/);
    assert.notEqual(get('conferencia-texto').textContent,'');
    alterar('preco-atual',100);
    assert.match(get('conferencia-texto').textContent,/taxa estimada de/);
  }
  alterar('preco-atual','');
  assert.equal(get('conferencia').hidden,true);
  assert.equal(get('preco').textContent,preco);
});

test('Shopee UI: percentuais vazios, negativos, não finitos ou com precisão excessiva são rejeitados',()=>{
  for(const campo of ['imposto','ads','margem','comissao-manual']) {
    for(const valor of ['',-1,'Infinity','NaN',100,'0.001']) {
      const {get,alterar}=executar({modo:'manual','preco-atual':100});
      alterar(campo,valor);
      assert.equal(get('preco').textContent,'—',`${campo}: ${valor}`);
      assert.notEqual(get('erro').textContent,'',`${campo}: ${valor}`);
      if(campo==='margem') {
        assert.equal(get('conferencia').hidden,false);
        assert.match(get('conferencia-texto').textContent,/taxa estimada de/);
      } else if(!get('conferencia').hidden) assert.doesNotMatch(get('conferencia-texto').textContent,/taxa estimada de/);
      alterar(campo,0);
      assert.equal(get('erro').textContent,'',`${campo}: recuperação após ${valor}`);
      assert.notEqual(get('preco').textContent,'—',`${campo}: recuperação após ${valor}`);
    }
  }
});

test('Shopee UI: controles manuais inválidos deixam de interferir ao voltar ao automático',()=>{
  const {get,alterar}=executar({modo:'manual','preco-atual':100});
  alterar('fixa-manual','0.001');
  alterar('comissao-manual','');
  assert.equal(get('preco').textContent,'—');
  alterar('modo','automatico','change');
  assert.equal(get('fixa-manual').disabled,true);
  assert.equal(get('comissao-manual').disabled,true);
  assert.equal(get('erro').textContent,'');
  assert.notEqual(get('preco').textContent,'—');
  assert.equal(get('conferencia').hidden,false);
  alterar('modo','manual','change');
  assert.equal(get('preco').textContent,'—');
  assert.notEqual(get('erro').textContent,'');
});

test('Shopee UI: página mantém rótulos, teclado decimal, data de revisão e ressalvas explícitas',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../shopee-tarifas.html'),'utf8');
  const inputs=[...html.matchAll(/<input\b[^>]*>/g)].map(match=>match[0]);
  assert.equal(inputs.length,9);
  for(const input of inputs) {
    assert.match(input,/type="number"/);
    assert.match(input,/inputmode="decimal"/);
    assert.match(input,/step="0\.01"/);
    assert.match(html,new RegExp('<label[^>]*>[^<]+?'+input.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'</label>'));
  }
  assert.match(html,/Lucro líquido estimado/);
  assert.match(html,/Margem efetiva estimada/);
  assert.match(html,/Custos não informados reduzem o lucro real/);
  assert.match(html,/Referência revisada em <time datetime="2026-10-18">18\/10\/2026<\/time>\. Conferência oficial pendente\./);
  assert.match(html,/A tabela ainda não tem confirmação oficial/);
  assert.doesNotMatch(html,/referências públicas verificadas|A tabela foi confrontada|neste ambiente/);
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
});
