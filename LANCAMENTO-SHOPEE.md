# Checklist de lançamento — Calculadora Shopee

Este arquivo descreve a preparação do lançamento da calculadora `shopee-tarifas.html` para o Lucro no Azul. **A criação desta branch e de um PR não publica o site. Fazer merge na `main` publica a página automaticamente via GitHub Pages. Não fazer merge sem autorização explícita do responsável pelo site.**

## Origem do código

- Revisão técnica: PR #3 (`melhoria/shopee-revisao-final`).
- A documentação de tarifas e os casos de teste estão em `PESQUISA-TARIFAS-2026-10.md` e `SHOPEE-VALIDACAO.md`.
- Os screenshots da política oficial do vendedor, fornecidos em 18/10/2026, mostram a tabela principal a partir de 01/10/2026, mas não fornecem toda a regra regressiva de CPF abaixo de R$ 12 e não são uma consulta em tempo real à conta.
- Não afirmar que a calculadora lê a conta da Shopee automaticamente.

## Mudanças reservadas para o lançamento

- Alterar a tag `robots` da nova página de `noindex,follow` para `index,follow`.
- Adicionar o endereço `https://lucronoazul.com.br/shopee-tarifas.html` a `sitemap.xml` e `sitemap.txt`.
- Adicionar links contextuais para a página nova em `index.html` e `marketplace.html`, preservando os nomes dos arquivos existentes.
- Atualizar o teste do sitemap de 13 para 14 URLs.
- Preservar checkout, CNAME, DNS, tag GA4, política de privacidade e fórmulas das demais calculadoras.

## Critérios para aprovação (conferência manual)

- [ ] Revisar na conta oficial e registrar exatamente como a Shopee trata preços no limite: R$ 8,99/R$ 9; R$ 11,99/R$ 12; R$ 79,99/R$ 80; R$ 99,99/R$ 100; R$ 199,99/R$ 200; R$ 499,99/R$ 500. As capturas são legíveis, mas os títulos "acima de" e os exemplos não substituem o extrato de transações.
- [ ] Confirmar a base de cobrança e arredondamento por **item**, a incidência de tarifas em quantidade maior que 1, descontos e campanhas. Não inferir com base apenas em uma imagem.
- [ ] Manter cálculo automático bloqueado para CPF abaixo de R$ 12 enquanto a fórmula regressiva completa não for verificada. Oferecer o modo manual.
- [ ] Checar que a comissão básica não soma outra taxa de transação, já incluída no percentual indicado na política.
- [ ] Não somar subsídio Pix como lucro automático nem subtrair novamente taxas que já consideram o subsídio. Preços, fretes e campanhas reais precisam ser informados pelo vendedor.
- [ ] Conferir os resultados de pelo menos três exemplos reais autorizados, sem compartilhar dados pessoais da conta ou números de documento.
- [ ] Executar `node --test tests/*.test.cjs` e confirmar GitHub Actions no último commit da branch.
- [ ] Testar navegador com teclado, modo manual/automático e larguras de 320, 390, 768 e 1365 px, incluindo entradas inválidas e valores altos. Verificar que não há rolagem horizontal.
- [ ] Verificar links locais, título, canonical da página, `robots`, sitemap com 14 URLs e ausência de referências à nova página na produção **antes** do merge.
- [ ] Obter autorização explícita para publicar; realizar merge do PR de lançamento somente após essa autorização.

## Verificação após lançamento

1. Abrir `https://lucronoazul.com.br/shopee-tarifas.html`, conferir HTTPS, estilos, scripts, cálculo e mensagens de ressalva em dispositivos diferentes.
2. Abrir a home e `marketplace.html` e testar os novos links. Conferir `sitemap.xml` e `robots.txt`.
3. Verificar o botão do Kit e as calculadoras existentes para garantir que a publicação não causou regressões.
4. Acompanhar indexação e consultas no Search Console e uso da ferramenta no GA4; não presumir tráfego ou vendas.
5. Caso surja erro técnico ou comercial, interromper divulgação e reverter o commit de lançamento com um novo PR/commit revisado.

## Pendências explícitas

Sem fórmula oficial para o CPF abaixo de R$ 12, **não anunciar cálculo automático dessa situação**. Tarifas gerais e limites precisam ser revisados periodicamente; uma tabela fixa pode ficar obsoleta. O serviço é gratuito e informativo; não é consulta oficial a uma conta ou garantia de lucro.
