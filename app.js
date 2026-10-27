
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const el=id=>document.getElementById(id);
const val=id=>Number(el(id)?.value);
const set=(id,v)=>{if(el(id))el(id).textContent=typeof v==='number'?brl(v):v};

function registrarEvento(nome,parametros={}){
  try{
    if(localStorage.getItem('precocerto_analytics_consent')!=='accepted')return;
  }catch{
    return;
  }

  if(typeof window.gtag!=='function')return;

  window.gtag('event',nome,parametros);
}

function calculate(){
  const form=el('calculator');
  if(!form)return false;

  const kind=form.dataset.kind;
  const inputs=[...form.querySelectorAll('input')];
  const results=['preco','custo','material','energia','outros','taxaFinal','lucro'];

  const invalid=message=>{
    set('erro',message);
    results.forEach(id=>set(id,'—'));
    return false;
  };

  if(inputs.some(x=>x.value.trim()===''||!Number.isFinite(Number(x.value))||Number(x.value)<0)){
    return invalid('Preencha todos os campos com números válidos e não negativos.');
  }

  let custo=0,rate=0,material=0,energia=0,outros=0;

  if(kind==='impressao'){
    material=val('filamento')*val('gramas')/1000;
    energia=val('watts')/1000*val('horas')*val('tarifa');
    outros=val('maquina')*val('horas')+val('extras');
    custo=material+energia+outros;
    rate=val('taxas')+val('margem');
  }else if(kind==='margem'){
    custo=val('custoBase');
    rate=val('taxas')+val('margem');
  }else if(kind==='marketplace'){
    custo=val('produto')+val('embalagem')+val('frete')+val('tarifaFixa');
    rate=val('comissao')+val('imposto')+val('margem');
  }

  if(rate>=100){
    return invalid('A soma das taxas percentuais e da margem precisa ser menor que 100%.');
  }

  const preco=custo/(1-rate/100);

  const taxas=kind==='marketplace'
    ?preco*(val('comissao')+val('imposto'))/100
    :preco*val('taxas')/100;

  const lucro=preco-custo-taxas;

  const values={
    preco,
    custo,
    material,
    energia,
    outros,
    taxaFinal:taxas,
    lucro
  };

  if(Object.values(values).some(v=>!Number.isFinite(v))){
    return invalid('Os números informados são muito altos. Confira os valores.');
  }

  set('erro','');
  Object.entries(values).forEach(([id,value])=>set(id,value));

  return true;
}

if(el('calculator')){
  const formulario=el('calculator');

  formulario.addEventListener('submit',e=>{
    e.preventDefault();

    if(calculate()){
      registrarEvento('calculo_concluido',{
        ferramenta:formulario.dataset.kind
      });
    }
  });

  formulario.querySelectorAll('input').forEach(x=>{
    x.addEventListener('input',calculate);
  });

  calculate();
}

function budget(){
  const form=el('budget');
  if(!form)return false;

  const limite=9007199254740991n;
  const decimal=id=>{
    const partes=/^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/.exec(el(id).value.trim());
    if(!partes)throw new Error('Informe quantidade maior que zero e valores válidos.');
    const [inteira,fracao='']=partes[2].split('.');
    const digitos=(inteira+fracao).replace(/^0+/,'');
    if(!digitos)return 0n;
    if(partes[1]==='-')throw new Error('Informe quantidade maior que zero e valores válidos.');
    const significativos=digitos.replace(/0+$/,'');
    const escala=BigInt(partes[3]||'0')-BigInt(fracao.length)+BigInt(digitos.length-significativos.length)+2n;
    if(escala<0n||BigInt(significativos.length)+escala>16n){
      throw new Error('Use até duas casas decimais e valores dentro do limite de precisão.');
    }
    const valor=BigInt(significativos)*10n**escala;
    if(valor>limite)throw new Error('Use até duas casas decimais e valores dentro do limite de precisão.');
    return valor;
  };

  const invalid=message=>{
    set('budgetError',message);
    set('total','—');
    set('resumo','Confira os valores informados.');
    el('budgetPaper').classList.add('budget-invalid');
    ['pdfData','pdfEmpresa','pdfCliente','pdfServico','pdfQuantidade','pdfUnitario','pdfSubtotal','pdfBruto','pdfDesconto','pdfTotal','pdfObservacoes'].forEach(id=>set(id,''));
    set('pdfErro','Orçamento indisponível para impressão. '+message);
    el('pdfErro').hidden=false;
    return false;
  };

  if(['empresa','cliente','servico'].some(id=>el(id).value.trim()==='')){
    return invalid('Preencha prestador, cliente e serviço antes de gerar o orçamento.');
  }

  let quantidade,unitario,desconto;
  try{
    quantidade=decimal('quantidade');
    unitario=decimal('unitario');
    desconto=decimal('desconto');
  }catch(error){
    return invalid(error.message);
  }

  if(quantidade<1n){
    return invalid('Informe quantidade maior que zero e valores válidos.');
  }

  const gross=(quantidade*unitario+50n)/100n;

  if(gross>limite){
    return invalid('Os números informados são muito altos. Confira os valores.');
  }

  if(desconto>gross){
    return invalid('O desconto não pode superar o subtotal.');
  }

  const total=gross-desconto;
  const moeda=centavos=>'R$\u00a0'+(centavos/100n).toLocaleString('pt-BR')+','+String(centavos%100n).padStart(2,'0');
  const fracaoQuantidade=String(quantidade%100n).padStart(2,'0').replace(/0+$/,'');
  const quantidadeTexto=String(quantidade/100n)+(fracaoQuantidade?'.'+fracaoQuantidade:'');

  set('budgetError','');
  el('budgetPaper').classList.remove('budget-invalid');
  el('pdfErro').hidden=true;
  set('total',moeda(total));

  const text=[
    `Prestador: ${el('empresa').value||'Não informado'}`,
    `Cliente: ${el('cliente').value||'Não informado'}`,
    `Serviço: ${el('servico').value||'Não informado'}`,
    `Quantidade: ${quantidadeTexto}`,
    `Preço unitário: ${moeda(unitario)}`,
    `Desconto: ${moeda(desconto)}`,
    `Observações: ${el('observacoes').value||'Nenhuma'}`
  ].join(' | ');

  set('resumo',text);

  const write=(id,v)=>{
    const node=el(id);
    if(node)node.textContent=v;
  };

  write('pdfData',new Date().toLocaleDateString('pt-BR'));
  write('pdfEmpresa',el('empresa').value.trim()||'Não informado');
  write('pdfCliente',el('cliente').value.trim()||'Não informado');
  write('pdfServico',el('servico').value.trim()||'Não informado');
  write('pdfQuantidade',quantidadeTexto.replace('.',','));
  write('pdfUnitario',moeda(unitario));
  write('pdfSubtotal',moeda(gross));
  write('pdfBruto',moeda(gross));
  write('pdfDesconto',moeda(desconto));
  write('pdfTotal',moeda(total));
  write('pdfObservacoes',el('observacoes').value.trim()||'Nenhuma');

  return true;
}

if(el('budget')){
  const formulario=el('budget');

  formulario.addEventListener('submit',e=>{
    e.preventDefault();

    if(budget()){
      registrarEvento('orcamento_atualizado');
      registrarEvento('calculo_concluido',{ferramenta:'orcamento'});
    }
  });

  formulario.querySelectorAll('input,textarea').forEach(x=>{
    x.addEventListener('input',budget);
  });

  el('printBudget').addEventListener('click',()=>{
    if(budget())window.print();
    else formulario.reportValidity();
  });

  let ultimaAberturaImpressao=0;

  window.addEventListener('beforeprint',()=>{
    if(!budget())return;
    const agora=Date.now();

    if(agora-ultimaAberturaImpressao>1500){
      ultimaAberturaImpressao=agora;
      registrarEvento('orcamento_impressao_aberta');
    }
  });

  budget();
}
