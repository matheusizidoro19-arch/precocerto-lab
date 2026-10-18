(() => {
  const $ = id => document.getElementById(id);
  const brl = centavos => (centavos / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const pct = valor => valor.toLocaleString('pt-BR',{maximumFractionDigits:2}) + '%';
  const limpar = mensagem => {
    $('shopee-erro').textContent = mensagem;
    ['preco','comissao','fixa','adicional','encargos','custo-total','lucro','margem-final'].forEach(id => $('shopee-'+id).textContent='—');
    $('shopee-faixa').textContent='Revise os dados informados.';
    $('shopee-conferencia').hidden=true;
  };
  const numero = (id,opcional=false) => {
    const el=$(id);
    if (opcional && el.value.trim()==='') return null;
    if (el.value.trim()==='') throw new Error('Preencha todos os campos obrigatórios.');
    const valor=Number(el.value.replace(',','.'));
    if (!Number.isFinite(valor) || valor<0) throw new Error('Informe somente números válidos e não negativos.');
    return valor;
  };
  const cents = id => Math.round(numero(id)*100);
  const manual = $('shopee-manual');
  const modo = $('shopee-modo');
  modo.addEventListener('change',()=>{
    manual.hidden=modo.value!=='manual';
    atualizar();
  });
  function atualizar() {
    try {
      const custoCentavos=cents('shopee-custo')+cents('shopee-embalagem')+cents('shopee-frete');
      const config={
        perfil:$('shopee-perfil').value,
        custoCentavos,
        impostoPercentual:numero('shopee-imposto'),
        anuncioPercentual:numero('shopee-ads'),
        margemPercentual:numero('shopee-margem'),
        modo:modo.value,
        percentualManual:modo.value==='manual'?numero('shopee-comissao-manual'):0,
        fixaManualCentavos:modo.value==='manual'?cents('shopee-fixa-manual'):0
      };
      const r=window.ShopeeTarifas.calcularPreco(config);
      $('shopee-erro').textContent='';
      $('shopee-preco').textContent=brl(r.precoCentavos);
      $('shopee-faixa').textContent='Faixa: '+r.tarifa.faixa;
      $('shopee-comissao').textContent=pct(r.tarifa.percentual)+' ('+brl(r.tarifa.percentualCentavos)+')';
      $('shopee-fixa').textContent=brl(r.tarifa.fixoCentavos);
      $('shopee-adicional').textContent=brl(r.tarifa.adicionalCpfCentavos);
      $('shopee-encargos').textContent=brl(r.tributosCentavos+r.publicidadeCentavos);
      $('shopee-custo-total').textContent=brl(custoCentavos);
      $('shopee-lucro').textContent=brl(r.lucroCentavos);
      $('shopee-margem-final').textContent=pct(r.margemEfetiva);
      $('shopee-aviso').textContent= r.aviso
        ? 'Atenção: '+r.aviso+' Tarifa estimada por tabela pública, sem consulta à sua conta. Verifique condições e taxas atuais.'
        : 'Atenção: '+(modo.value==='manual'?'Tarifas informadas por você.':'Tabela pública de referência desde 01/10/2026, revisada em fontes secundárias em 18/10/2026.')+' Não é uma consulta ao seu extrato. Confirme campanhas, frete, tributos e outras cobranças.';
      const atual=numero('shopee-preco-atual',true);
      $('shopee-conferencia').hidden=atual===null;
      if(atual!==null){
        try{
          const ref=window.ShopeeTarifas.conferirPreco(config,Math.round(atual*100));
          $('shopee-conferencia-texto').textContent='No preço de '+brl(ref.precoCentavos)+', taxa estimada de '+brl(ref.tarifa.totalCentavos)+' e lucro aproximado de '+brl(ref.lucroCentavos)+' ('+pct(ref.margemEfetiva)+').';
        }catch(e){$('shopee-conferencia-texto').textContent=e.message;}
      }
      return true;
    }catch(e){limpar(e.message||'Confira os valores e tente novamente.');return false;}
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

