# Validação técnica da calculadora Shopee

## Escopo e limites

O motor valida a matemática da tabela embutida, não a política comercial da Shopee. A situação de cada regra e as tentativas de consulta estão em [PESQUISA-TARIFAS-2026-10.md](PESQUISA-TARIFAS-2026-10.md). A data `CONFERENCIA` identifica a revisão da referência; não comprova leitura ou confirmação oficial.

- Valores monetários de entrada são centavos inteiros, sem frações de centavo.
- Preços elegíveis vão de 1 a 100.000.000 centavos, inclusive: R$ 0,01 a R$ 1.000.000,00.
- O automático para CPF só admite preços a partir de R$ 12,00, pois a regra inferior não foi confirmada. O mínimo encontrado é restrito a esse domínio.
- Percentuais têm até duas casas decimais, entre 0 e 99,99. Entradas com maior precisão são rejeitadas, sem arredondamento silencioso.
- Cada parcela percentual é arredondada separadamente ao centavo mais próximo, com empate para cima. Essa é uma hipótese do modelo a conferir na política comercial.
- O lucro é a diferença inteira entre preço, custos e parcelas; não recebe outro arredondamento.
- A margem efetiva é lucro dividido pelo preço. Sua apresentação é arredondada, mas o critério de aceitação não é.
- No manual, comissão e tarifa fixa permanecem constantes na simulação. Uma tarifa real regressiva ou dependente do preço deve ser conferida novamente ao mudar o preço.

## Por que a busca encontra o menor preço

Considere `D = 10000`, uma taxa inteira `b` em pontos-base e um preço inteiro `p`. A parcela arredondada é `floor((p*b + D/2)/D)`.

Em cada faixa, o período `T = D/mdc(D, b1, b2, ...)` garante que `T*bi/D` é inteiro para todas as parcelas. Portanto, aumentar o preço em `T` centavos aumenta cada parcela por uma quantidade inteira constante e preserva seu padrão de arredondamento.

Para margem `m` em pontos-base, defina o saldo exato `S(p) = lucro(p)*D - p*m`. A meta é satisfeita se, e somente se, `S(p) >= 0`. Não se arredonda a margem nem o lucro necessário para aceitar um preço.

Em uma sequência `p = p0 + k*T`, o saldo muda por `T*(D - somaTaxas - m)` a cada passo. O motor enumera as primeiras bases de todas as classes de resíduos da faixa:

1. Se a base já atende à meta, ela é o mínimo da classe.
2. Se não atende e o incremento é positivo, o primeiro passo válido é calculado por divisão inteira com teto, respeitando o limite superior da faixa.
3. Se não atende e o incremento é nulo ou negativo, nenhum preço posterior da classe atende.

O menor candidato das classes é o mínimo da faixa. Como as faixas são disjuntas e estão ordenadas por preço, a primeira faixa com solução contém o mínimo global do domínio elegível. Isso não pressupõe monotonicidade entre centavos consecutivos: arredondamentos podem tornar um preço válido seguido de outro inválido.

Custos e tarifas fixas limitados a 100.000.000 centavos mantêm os intermediários inteiros abaixo de `Number.MAX_SAFE_INTEGER`. `conferirPreco` calcula um preço informado diretamente; não depende de uma meta de margem nem da existência de sugestão.

## Regressões e comandos

Na raiz do checkout, com Node.js 22 ou superior:

```sh
node --test tests/*.test.cjs
```

Os testes de referência calculam tarifas e lucro independentemente do motor, com `BigInt`, e enumeram todos os preços em intervalos pequenos. Incluem faixas, perfis, encargos decimais, estados sem solução e custos próximos ao teto. Os testes da interface usam DOM simulado; não substituem a validação nativa de um navegador.

Casos que devem permanecer cobertos:

- CNPJ, custo R$ 10, tributos 10%, publicidade 10%, margem 20%: mínimo R$ 36,24. R$ 36,26 rende cerca de 19,994484%, abaixo da meta.
- Manual, custos e tarifa fixa zero, comissão e margem de 50%: mínimo R$ 0,02.
- Custo R$ 40, margem desejada 90%, preço atual R$ 100: sugestão indisponível, mas conferência da referência mostra tarifa R$ 34 e lucro R$ 26.
- Antes, no limite e depois de R$ 9, R$ 12, R$ 80, R$ 100 e R$ 200 nos três perfis.
- A entrada de margem `19,994148%` não é suportada pela precisão do formulário e deve gerar erro explícito, sem ser convertida silenciosamente em outra meta.

No Chromium, conferir larguras de 320, 390, 768 e 1365 pixels, teclado, campos manuais desativados, mudanças sucessivas e entradas inválidas, mensagens anunciáveis, contraste, ausência de rolagem horizontal e erros de JavaScript. Verificar também valores altos nos resultados. Testes com requisições externas bloqueadas não demonstram recebimento de eventos no GA4.

## Condições para publicação

Manter a página em branch de revisão, com `noindex`, fora do menu e do sitemap. Isso não bloqueia acesso a uma URL que seja publicada: não integrar à `main` sem autorização explícita.

Antes da liberação pública, obter evidências oficiais das tarifas e exceções, conferir o extrato de uma situação autorizada, validar a versão final no GitHub Actions e concluir a revisão humana. A correção matemática não resolve a ausência de confirmação comercial.
