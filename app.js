
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

  const nums=['quantidade','unitario','desconto'];

  const invalid=message=>{
    set('budgetError',message);
    set('total','—');
    set('resumo','Confira os valores informados.');
    return false;
  };

  if(nums.some(id=>el(id).value.trim()===''||!Number.isFinite(val(id))||val(id)<0)||val('quantidade')<0.01){
    return invalid('Informe quantidade maior que zero e valores válidos.');
  }

  const gross=val('quantidade')*val('unitario');
  const total=gross-val('desconto');

  if(!Number.isFinite(gross)||!Number.isFinite(total)){
    return invalid('Os números informados são muito altos. Confira os valores.');
  }

  if(val('desconto')>gross){
    return invalid('O desconto não pode superar o subtotal.');
  }

  set('budgetError','');
  set('total',total);

  const text=[
    `Prestador: ${el('empresa').value||'Não informado'}`,
    `Cliente: ${el('cliente').value||'Não informado'}`,
    `Serviço: ${el('servico').value||'Não informado'}`,
    `Quantidade: ${val('quantidade')}`,
    `Preço unitário: ${brl(val('unitario'))}`,
    `Desconto: ${brl(val('desconto'))}`,
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
  write('pdfQuantidade',String(val('quantidade')).replace('.',','));
  write('pdfUnitario',brl(val('unitario')));
  write('pdfSubtotal',brl(gross));
  write('pdfBruto',brl(gross));
  write('pdfDesconto',brl(val('desconto')));
  write('pdfTotal',brl(total));
  write('pdfObservacoes',el('observacoes').value.trim()||'Não informado');

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
  });

  let ultimaAberturaImpressao=0;

  window.addEventListener('beforeprint',()=>{
    const agora=Date.now();

    if(agora-ultimaAberturaImpressao>1500){
      ultimaAberturaImpressao=agora;
      registrarEvento('orcamento_impressao_aberta');
    }
  });

  budget();
}
