(function (root) {
  'use strict';
  const VIGENCIA = '2026-10-01';
  const CONFERENCIA = '2026-10-18';
  const MAX_CENTAVOS = 100000000;
  const faixas = [
    { inicio: 1, fim: 899, percentual: 20, fixa: 0, especial: true, titulo: 'Abaixo de R$ 9,00' },
    { inicio: 900, fim: 7999, percentual: 20, fixa: 450, titulo: 'R$ 9,00 a R$ 79,99' },
    { inicio: 8000, fim: 9999, percentual: 14, fixa: 1600, titulo: 'R$ 80,00 a R$ 99,99' },
    { inicio: 10000, fim: 19999, percentual: 14, fixa: 2000, titulo: 'R$ 100,00 a R$ 199,99' },
    { inicio: 20000, fim: MAX_CENTAVOS, percentual: 14, fixa: 2600, titulo: 'R$ 200,00 ou mais' }
  ];
  const inteiro = n => Number.isInteger(n) && n >= 0;
  function calcularTarifa(centavos, perfil) {
    if (!inteiro(centavos) || centavos < 1 || centavos > MAX_CENTAVOS) return null;
    if (!['cnpj', 'cpf_ate_450', 'cpf_acima_450'].includes(perfil)) return null;
    if (perfil !== 'cnpj' && centavos < 1200) return null;
    const faixa = faixas.find(item => centavos >= item.inicio && centavos <= item.fim);
    if (!faixa) return null;
    const percentualCentavos = Math.round(centavos * faixa.percentual / 100);
    const fixoCentavos = faixa.especial ? Math.round(centavos * 0.5) : faixa.fixa;
    const adicionalCpfCentavos = perfil === 'cpf_acima_450' ? 300 : 0;
    return {
      percentual: faixa.percentual,
      percentualCentavos,
      fixoCentavos,
      adicionalCpfCentavos,
      totalCentavos: percentualCentavos + fixoCentavos + adicionalCpfCentavos,
      faixa: faixa.titulo,
      especial: !!faixa.especial
    };
  }
  function calcularPreco(config) {
    const { perfil, custoCentavos, impostoPercentual, anuncioPercentual, margemPercentual, modo, percentualManual, fixaManualCentavos } = config;
    if (!inteiro(custoCentavos) || custoCentavos > MAX_CENTAVOS) throw new Error('Informe custos válidos.');
    if (![impostoPercentual, anuncioPercentual, margemPercentual].every(x => Number.isFinite(x) && x >= 0 && x < 100)) throw new Error('Informe percentuais entre 0 e 99,99.');
    if (modo !== 'manual' && !['cnpj','cpf_ate_450','cpf_acima_450'].includes(perfil)) throw new Error('Selecione um perfil de vendedor.');
    if (modo === 'manual' && (!Number.isFinite(percentualManual) || percentualManual < 0 || percentualManual >= 100 || !inteiro(fixaManualCentavos))) throw new Error('Informe corretamente a comissão e a tarifa manual.');
    const calcular = (centavos) => {
      const tarifa = modo === 'manual' ? {
        percentual: percentualManual,
        percentualCentavos: Math.round(centavos * percentualManual / 100),
        fixoCentavos: fixaManualCentavos,
        adicionalCpfCentavos: 0,
        totalCentavos: Math.round(centavos * percentualManual / 100) + fixaManualCentavos,
        faixa: 'Taxas informadas pelo usuário', especial: false
      } : calcularTarifa(centavos, perfil);
      if (!tarifa) return null;
      const tributosCentavos = Math.round(centavos * impostoPercentual / 100);
      const publicidadeCentavos = Math.round(centavos * anuncioPercentual / 100);
      const lucroCentavos = centavos - custoCentavos - tarifa.totalCentavos - tributosCentavos - publicidadeCentavos;
      const margemEfetiva = 100 * lucroCentavos / centavos;
      return { precoCentavos: centavos, tarifa, tributosCentavos, publicidadeCentavos, lucroCentavos, margemEfetiva };
    };
    const segmentos = modo === 'manual' ? [{inicio:1,fim:MAX_CENTAVOS}] : faixas;
    let melhor = null;
    for (const faixa of segmentos) {
      let inicio = faixa.inicio;
      let fim = faixa.fim;
      if (modo !== 'manual' && perfil !== 'cnpj') inicio = Math.max(inicio,1200);
      if (inicio > fim) continue;
      const valido = (preco) => {
        const r = calcular(preco);
        return !!r && r.lucroCentavos >= Math.round(preco * margemPercentual / 100);
      };
      if (!valido(fim)) continue;
      while (inicio < fim) {
        const meio = Math.floor((inicio + fim) / 2);
        if (valido(meio)) fim = meio;
        else inicio = meio + 1;
      }
      if (valido(inicio) && (!melhor || inicio < melhor.precoCentavos)) melhor = calcular(inicio);
    }
    if (!melhor) throw new Error('Não foi possível encontrar um preço positivo nessa faixa de valores. Confira custos e margens.');
    return {
      ...melhor,
      aviso: modo !== 'manual' && perfil !== 'cnpj' ? 'Para CPF, as tarifas abaixo de R$ 12 possuem regra regressiva não validada. O preço sugerido considera apenas faixas a partir de R$ 12.' : '',
      modo: modo === 'manual' ? 'manual' : 'referencia',
      vigencia: VIGENCIA,
      conferencia: CONFERENCIA
    };
  }
  function conferirPreco(config, precoCentavos) {
    if (!inteiro(precoCentavos) || precoCentavos < 1 || precoCentavos > MAX_CENTAVOS) throw new Error('Informe um preço de venda válido.');
    const dados = calcularPreco(config);
    const { perfil, custoCentavos, impostoPercentual, anuncioPercentual, modo, percentualManual, fixaManualCentavos } = config;
    const tarifa = modo === 'manual' ? {
      percentual: percentualManual, percentualCentavos: Math.round(precoCentavos*percentualManual/100), fixoCentavos: fixaManualCentavos,
      adicionalCpfCentavos: 0, totalCentavos: Math.round(precoCentavos*percentualManual/100) + fixaManualCentavos,
      faixa: 'Taxas informadas pelo usuário'
    } : calcularTarifa(precoCentavos,perfil);
    if (!tarifa) throw new Error('A tarifa automática para CPF abaixo de R$ 12 não foi confirmada. Use o modo manual com a tarifa do seu extrato.');
    const tributosCentavos = Math.round(precoCentavos*impostoPercentual/100);
    const publicidadeCentavos = Math.round(precoCentavos*anuncioPercentual/100);
    const lucroCentavos = precoCentavos - custoCentavos - tarifa.totalCentavos - tributosCentavos - publicidadeCentavos;
    return {precoCentavos,tarifa,tributosCentavos,publicidadeCentavos,lucroCentavos,margemEfetiva:lucroCentavos/precoCentavos*100,referencia:dados.precoCentavos};
  }
  const api = {VIGENCIA,CONFERENCIA,calcularTarifa,calcularPreco,conferirPreco};
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.ShopeeTarifas = api;
})(typeof window !== 'undefined' ? window : null);

