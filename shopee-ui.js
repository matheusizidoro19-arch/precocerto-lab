(() => {
  const $ = id => document.getElementById(id);
  const brl = centavos => (centavos / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const pct = valor => valor.toLocaleString('pt-BR',{maximumFractionDigits:2}) + '%';
  const limparSugestao = mensagem => {
    $('shopee-erro').textContent = mensagem;
    ['preco','comissao','fixa','adicional','encargos','custo-total','lucro','margem-final'].forEach(id => $('shopee-'+id).textContent='—');
    $('shopee-faixa').textContent='Revise os dados informados.';
  };
  const numero = id => {
    const el=$(id);
    if (el.value.trim()==='') throw new Error('Preencha todos os campos obrigatórios.');
    const valor=Number(el.value.replace(',','.'));
    if (!Number.isFinite(valor) || valor<0) throw new Error('Informe somente números válidos e não negativos.');
    return valor;
  };
  const cents = id => {
    const valor=numero(id);
    const centavos=Math.round(valor*100);
    if (!Number.isSafeInteger(centavos) || valor!==centavos/100) throw new Error('Informe valores monetários válidos, com até duas casas decimais.');
    return centavos;
  };
  const manual = $('shopee-manual');
  const modo = $('shopee-modo');
  modo.addEventListener('change',atualizar);
  function atualizarModo() {
    const ativo=modo.value==='manual';
    manual.hidden=!ativo;
    manual.querySelectorAll('input,select').forEach(el=>el.disabled=!ativo);
    $('shopee-perfil').disabled=ativo;
    $('shopee-aviso').textContent=ativo
      ? 'Atenção: tarifas informadas por você; se mudam por faixa ou são regressivas, a simulação pode variar com o preço. Não é uma consulta ao seu extrato. Confirme campanhas, frete, tributos e outras cobranças.'
      : 'Atenção: tabela de referência com vigência informada no modelo desde 01/10/2026, ainda não confirmada; as condições não foram confirmadas diretamente na Shopee. Não acessa sua conta em tempo real. Para CPF abaixo de R$ 12,00, a regra regressiva não foi validada e o cálculo automático não está disponível; o preço sugerido para CPF considera apenas faixas a partir de R$ 12,00 e não representa o menor preço possível abaixo desse valor. Consulte seu painel e use o modo manual. Campanhas, multas, frete adicional, devoluções, tributos e outras condições podem alterar o resultado.';
  }
  function atualizar() {
    atualizarModo();
    try {
      const custoCentavos=cents('shopee-custo')+cents('shopee-embalagem')+cents('shopee-frete');
      const config={
        perfil:$('shopee-perfil').value,
        custoCentavos,
        impostoPercentual:numero('shopee-imposto'),
        anuncioPercentual:numero('shopee-ads'),
        modo:modo.value,
        percentualManual:modo.value==='manual'?numero('shopee-comissao-manual'):0,
        fixaManualCentavos:modo.value==='manual'?cents('shopee-fixa-manual'):0
      };
      let sugestaoValida=false;
      try {
        const r=window.ShopeeTarifas.calcularPreco({...config,margemPercentual:numero('shopee-margem')});
        $('shopee-erro').textContent='';
        $('shopee-preco').textContent=brl(r.precoCentavos);
        $('shopee-faixa').textContent=(config.perfil!=='cnpj' && modo.value!=='manual' ? 'Preço limitado às faixas de R$ 12,00 ou mais. ' : '')+'Faixa: '+r.tarifa.faixa;
        $('shopee-comissao').textContent=pct(r.tarifa.percentual)+' ('+brl(r.tarifa.percentualCentavos)+')';
        $('shopee-fixa').textContent=brl(r.tarifa.fixoCentavos);
        $('shopee-adicional').textContent=brl(r.tarifa.adicionalCpfCentavos);
        $('shopee-encargos').textContent=brl(r.tributosCentavos+r.publicidadeCentavos);
        $('shopee-custo-total').textContent=brl(custoCentavos);
        $('shopee-lucro').textContent=brl(r.lucroCentavos);
        $('shopee-margem-final').textContent=pct(r.margemEfetiva);
        sugestaoValida=true;
      }catch(e){limparSugestao(e.message||'Confira os valores e tente novamente.');}
      $('shopee-conferencia').hidden=$('shopee-preco-atual').value.trim()==='';
      if(!$('shopee-conferencia').hidden){
        try {
          const ref=window.ShopeeTarifas.conferirPreco(config,cents('shopee-preco-atual'));
          $('shopee-conferencia-texto').textContent='No preço de '+brl(ref.precoCentavos)+', taxa estimada de '+brl(ref.tarifa.totalCentavos)+' e lucro líquido estimado de '+brl(ref.lucroCentavos)+' (margem efetiva de '+pct(ref.margemEfetiva)+').';
        }catch(e){$('shopee-conferencia-texto').textContent=e.message;}
      }
      return sugestaoValida;
    }catch(e){
      limparSugestao(e.message||'Confira os valores e tente novamente.');
      $('shopee-conferencia').hidden=true;
      return false;
    }
  }
  $('shopee-form').addEventListener('submit',e=>{
    e.preventDefault();
    if(!atualizar())return;
    try{
      if(localStorage.getItem('precocerto_analytics_consent')==='accepted'&&typeof window.gtag==='function') window.gtag('event','calculo_concluido',{ferramenta:'shopee_tarifas'});
    }catch{}
  });
  $('shopee-form').querySelectorAll('input,select').forEach(el=>el.addEventListener('input',atualizar));
  atualizar();
})();
