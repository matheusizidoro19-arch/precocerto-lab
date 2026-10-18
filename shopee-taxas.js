(function (root) {
  'use strict';
  const VIGENCIA = '2026-10-01';
  const CONFERENCIA = '2026-10-18';
  const MAX_CENTAVOS = 100000000;
  const ESCALA = 10000;
  const faixas = [
    { inicio: 1, fim: 899, percentual: 20, fixa: 0, especial: true, titulo: 'Abaixo de R$ 9,00' },
    { inicio: 900, fim: 7999, percentual: 20, fixa: 450, titulo: 'R$ 9,00 a R$ 79,99' },
    { inicio: 8000, fim: 9999, percentual: 14, fixa: 1600, titulo: 'R$ 80,00 a R$ 99,99' },
    { inicio: 10000, fim: 19999, percentual: 14, fixa: 2000, titulo: 'R$ 100,00 a R$ 199,99' },
    { inicio: 20000, fim: MAX_CENTAVOS, percentual: 14, fixa: 2600, titulo: 'R$ 200,00 ou mais' }
  ];
  const inteiro = n => Number.isSafeInteger(n) && n >= 0;
  const arredondar = (centavos, pontos) => Math.floor((centavos * pontos + ESCALA / 2) / ESCALA);
  function percentualEmPontos(valor) {
    const pontos = Math.round(valor * 100);
    if (!Number.isFinite(valor) || valor < 0 || valor >= 100 || valor !== pontos / 100) throw new Error('Informe percentuais entre 0 e 99,99, com até duas casas decimais.');
    return pontos;
  }
  function prepararConfig(config) {
    const { modo, perfil, custoCentavos, fixaManualCentavos } = config;
    if (!inteiro(custoCentavos) || custoCentavos > MAX_CENTAVOS) throw new Error('Informe custos válidos.');
    if (!['automatico', 'manual'].includes(modo)) throw new Error('Selecione uma forma de cálculo.');
    if (modo !== 'manual' && !['cnpj', 'cpf_ate_450', 'cpf_acima_450'].includes(perfil)) throw new Error('Selecione um perfil de vendedor.');
    if (modo === 'manual' && (!inteiro(fixaManualCentavos) || fixaManualCentavos > MAX_CENTAVOS)) throw new Error('Informe corretamente a tarifa manual.');
    return {
      ...config,
      impostoPontos: percentualEmPontos(config.impostoPercentual),
      anuncioPontos: percentualEmPontos(config.anuncioPercentual),
      manualPontos: modo === 'manual' ? percentualEmPontos(config.percentualManual) : 0
    };
  }
  function calcularTarifa(centavos, perfil) {
    if (!inteiro(centavos) || centavos < 1 || centavos > MAX_CENTAVOS) return null;
    if (!['cnpj', 'cpf_ate_450', 'cpf_acima_450'].includes(perfil)) return null;
    if (perfil !== 'cnpj' && centavos < 1200) return null;
    const faixa = faixas.find(item => centavos >= item.inicio && centavos <= item.fim);
    if (!faixa) return null;
    const percentualCentavos = arredondar(centavos, faixa.percentual * 100);
    const fixoCentavos = faixa.especial ? arredondar(centavos, 5000) : faixa.fixa;
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
  function avaliarPreco(dados, centavos) {
    const tarifa = dados.modo === 'manual' ? {
      percentual: dados.percentualManual,
      percentualCentavos: arredondar(centavos, dados.manualPontos),
      fixoCentavos: dados.fixaManualCentavos,
      adicionalCpfCentavos: 0,
      totalCentavos: arredondar(centavos, dados.manualPontos) + dados.fixaManualCentavos,
      faixa: 'Taxas informadas pelo usuário', especial: false
    } : calcularTarifa(centavos, dados.perfil);
    if (!tarifa) throw new Error('A tarifa automática para CPF abaixo de R$ 12 não foi confirmada. Use o modo manual com a tarifa do seu extrato.');
    const tributosCentavos = arredondar(centavos, dados.impostoPontos);
    const publicidadeCentavos = arredondar(centavos, dados.anuncioPontos);
    const lucroCentavos = centavos - dados.custoCentavos - tarifa.totalCentavos - tributosCentavos - publicidadeCentavos;
    return { precoCentavos: centavos, tarifa, tributosCentavos, publicidadeCentavos, lucroCentavos, margemEfetiva: 100 * lucroCentavos / centavos };
  }
  function mdc(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }
  function menorPrecoNaFaixa(dados, margemPontos, faixa) {
    const inicio = dados.modo !== 'manual' && dados.perfil !== 'cnpj' ? Math.max(faixa.inicio, 1200) : faixa.inicio;
    if (inicio > faixa.fim) return null;
    const pontos = [dados.modo === 'manual' ? dados.manualPontos : faixa.percentual * 100, dados.impostoPontos, dados.anuncioPontos];
    if (faixa.especial) pontos.push(5000);
    const fixos = dados.custoCentavos + faixa.fixa + (dados.modo !== 'manual' && dados.perfil === 'cpf_acima_450' ? 300 : 0);
    const periodo = ESCALA / pontos.reduce((divisor, valor) => mdc(divisor, valor), ESCALA);
    const incremento = periodo * (ESCALA - margemPontos - pontos.reduce((total, valor) => total + valor, 0));
    let melhor = null;
    for (let base = inicio; base <= Math.min(faixa.fim, inicio + periodo - 1); base++) {
      const lucro = base - fixos - pontos.reduce((total, valor) => total + arredondar(base, valor), 0);
      const saldo = lucro * ESCALA - base * margemPontos;
      let passos = 0;
      if (saldo < 0) {
        if (incremento <= 0) continue;
        passos = Math.ceil(-saldo / incremento);
        if (passos > Math.floor((faixa.fim - base) / periodo)) continue;
      }
      const preco = base + passos * periodo;
      if (melhor === null || preco < melhor) melhor = preco;
    }
    return melhor;
  }
  function calcularPreco(config) {
    const dados = prepararConfig(config);
    const margemPontos = percentualEmPontos(config.margemPercentual);
    const segmentos = dados.modo === 'manual' ? [{ inicio: 1, fim: MAX_CENTAVOS, percentual: dados.percentualManual, fixa: dados.fixaManualCentavos }] : faixas;
    let preco = null;
    for (const faixa of segmentos) {
      preco = menorPrecoNaFaixa(dados, margemPontos, faixa);
      if (preco !== null) break;
    }
    if (preco === null) throw new Error('Não foi possível encontrar um preço positivo nessa faixa de valores. Confira custos e margens.');
    return {
      ...avaliarPreco(dados, preco),
      aviso: dados.modo !== 'manual' && dados.perfil !== 'cnpj' ? 'Para CPF, as tarifas abaixo de R$ 12 possuem regra regressiva não validada. O preço sugerido considera apenas faixas a partir de R$ 12.' : '',
      modo: dados.modo === 'manual' ? 'manual' : 'referencia',
      vigencia: VIGENCIA,
      conferencia: CONFERENCIA
    };
  }
  function conferirPreco(config, precoCentavos) {
    if (!inteiro(precoCentavos) || precoCentavos < 1 || precoCentavos > MAX_CENTAVOS) throw new Error('Informe um preço de venda válido.');
    return avaliarPreco(prepararConfig(config), precoCentavos);
  }
  const api = {VIGENCIA,CONFERENCIA,calcularTarifa,calcularPreco,conferirPreco};
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.ShopeeTarifas = api;
})(typeof window !== 'undefined' ? window : null);
