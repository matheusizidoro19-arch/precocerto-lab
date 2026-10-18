# Pesquisa de tarifas Shopee — evidências e limitações (18/10/2026)

## Evidência visual da política oficial enviada pelo responsável pelo projeto

Em 18/10/2026, foram fornecidas cinco capturas de tela da página identificada como **Central de Educação do Vendedor Shopee — "Confira a Política de Comissão para vendedores CNPJ e CPF"**, publicação exibida como **18/09/2026**, com alteração de R$ 4,00 para R$ 4,50 na parcela fixa aplicável à faixa de até R$ 79,99 a partir de **01/10/2026**. As capturas podem ser examinadas na conversa de origem; não foram incorporadas ao repositório. A origem é identificável visualmente, mas a URL autenticada e o texto integral da página não foram verificados de maneira independente no ambiente de execução.

O usuário associou essas capturas à URL abaixo em resposta à pergunta de procedência, registrada sem parâmetro de rastreamento:

https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026

A tentativa com esse endereço completo também falhou no proxy em 18/10/2026: `urlopen` informou `Tunnel connection failed: 403 Forbidden`. O vínculo entre URL e capturas foi informado pelo usuário; não houve comparação online independente com o conteúdo da página.

**Valores legíveis nas capturas, organizados pelas faixas adotadas no modelo:**

| Faixa da venda | Parcela percentual | Parcela fixa, CNPJ | Adicional CPF com mais de 450 pedidos nos 90 dias anteriores |
| --- | --- | --- | --- |
| R$ 9,00 a R$ 79,99 | 20% | R$ 4,50 | R$ 3,00 por item somente a partir de R$ 12; abaixo disso, regra regressiva não determinada |
| R$ 80,00 a R$ 99,99 | 14% | R$ 16,00 | R$ 3,00 por item |
| R$ 100,00 a R$ 199,99 | 14% | R$ 20,00 | R$ 3,00 por item |
| R$ 200,00 ou mais | 14% | R$ 26,00 | R$ 3,00 por item |

**Exceções que as imagens confirmam parcialmente:**
- Para CNPJ, produtos abaixo de R$ 9,00: o componente fixo por item corresponde a metade do valor do produto. A estrutura percentual geral de 20% aparece na tabela, mas falta confirmar o arredondamento de cada parcela.
- Para CPF, a página descreve tarifa regressiva para produtos abaixo de R$ 12,00, **sem detalhar na imagem fórmula ou tabela**. O cálculo automático nessa faixa deve permanecer bloqueado para CPF. A distinção até/acima de 450 pedidos requer a consulta às condições da conta; não precisamos coletar o CPF do visitante.
- A página afirma que a comissão já contempla a taxa de transação; não adicionar outra taxa de transação arbitrariamente.
- A cobrança é descrita **por item vendido**, mas a aplicação a vários itens/unidades no mesmo pedido e regras por promoção ainda requerem confirmação adicional.

**Programas e benefícios exibidos, mas não incorporados ao cálculo do lucro:**
- Subsídio Pix indicado como **5%** para faixas de R$ 80,00 a R$ 499,99 e **até 8%** para valores a partir de R$ 500,00, conforme elegibilidade e condições. O exemplo de um item de R$ 500 mostra líquido recebido idêntico no Pix e em cartão/boleto, portanto seria incorreto somar automaticamente esse subsídio ao lucro.
- Benefícios de frete grátis divulgados em faixas de até **R$ 20** para item de até R$ 79,99, **R$ 30** de R$ 80 a R$ 199,99 e **R$ 40** acima de R$ 200, sempre sujeitos aos termos do programa. Não representam automaticamente frete gratuito para o vendedor.

**Diferença entre evidência e garantia:** as capturas sustentam os valores **das tabelas mostradas**, mas não provam que todas as lojas, campanhas, descontos, pedidos e arredondamentos produzem essas cobranças. Continuar mostrando resultado como estimativa, oferecer modo manual e orientar consulta ao extrato do vendedor. O código atual já corresponde aos percentuais e parcelas fixas dessas faixas e mantém o automático bloqueado para CPF abaixo de R$ 12; nenhuma mudança matemática é necessária apenas com essa evidência.

### Leitura contextual e pontos que continuam ambíguos

- C1 corresponde ao título, comunicado e tabela CNPJ; C2 ao exemplo Pix; C3 às notas CNPJ, tabela CPF e início da regra regressiva; C4 às notas CPF, frete e rodapé. C5 repete C1. Essa identificação permite localizar os trechos transcritos nas capturas da conversa; os originais não estão arquivados no repositório.
- O cabeçalho mostra `18-09-2026`; o comunicado informa ajuste a partir de `01/10/2026`; o rodapé diz “Última atualização: 01 de outubro de 2026”. `18/10/2026` é a data desta leitura documental, não uma nova vigência nem uma consulta online bem-sucedida.
- As tabelas escrevem “acima de R$ 80”, “acima de R$ 100”, “acima de R$ 200” e “acima de R$ 500”. As fronteiras inclusivas do motor não são uma transcrição literal inequívoca desses termos. O texto de frete não resolve, por si só, uma ambiguidade de comissão. O exemplo de R$ 500 confirma seu caso específico, sem provar elegibilidade de todas as lojas.
- Para CPF, C3 diz “ultrapassam 450 pedidos em um período de 90 dias”, enquanto C4 diz “menos de 450 pedidos nos últimos 90 dias”. Exatamente 450 não está explicitado; o perfil `cpf_ate_450` continua sendo uma hipótese nesse ponto. Orientar modo manual até a confirmação.
- C4 fala em “apenas a taxa fixa por item” no contexto da isenção dos R$ 3. Não se conclui desse trecho isolado que a comissão percentual foi abolida. MEI não é mencionado nominalmente, portanto sua equivalência com CNPJ permanece pendente.
- C3 afirma que a comissão não é cobrada em cancelamento, devolução, reembolso ou desistência e que já contempla a taxa de transação. O modelo considera uma venda concluída sem esses eventos; não aplica outra taxa de transação nem calcula estornos.
- A regra regressiva de CPF abaixo de R$ 12 aparece descrita, mas sem fórmula integral. O arredondamento de parcelas, inclusive meio centavo para CNPJ abaixo de R$ 9, não é informado. Manter essas limitações identificadas, sem inventar uma taxa substituta.

### Conferência do exemplo de R$ 500

| Coluna da captura C2 | Preço cadastrado | Valor fiscal do item | Subsídio Pix | Comissão indicada | Líquido recebido |
| --- | --- | --- | --- | --- | --- |
| Cartão ou boleto | R$ 500 | R$ 500 | R$ 0 | R$ 96 | R$ 404 |
| Pix | R$ 500 | R$ 460 | R$ 40 | R$ 56 | R$ 404 |

O motor CNPJ reproduz a coluna cartão/boleto: `500 × 14% + 26 = 96` e `500 − 96 = 404`, sem outros custos, tributos ou publicidade. Na coluna Pix, `460 − 56 = 404`: somar ou descontar novamente R$ 40 desse saldo contaria o benefício duas vezes. O exemplo não fornece uma fórmula geral de comissão Pix, descontos ou base tributária para outros preços e condições. O subsídio Pix não é aplicado automaticamente na ferramenta.

Os 81% e 88% exibidos na captura correspondem aproximadamente a `404/500` e `404/460`. Não comprovam lucro comercial depois de custos não informados. O motor usa o preço fornecido como denominador e não calcula base fiscal.

---

## Histórico da tentativa de consulta automatizada

### Alcance e procedência
O registro anterior desta pesquisa informa uma comparação da tabela de referência com publicações secundárias que atribuem as regras ao Centro de Educação do Vendedor Shopee. Esse registro não contém cópias ou trechos das páginas que permitam reproduzir a comparação. As datas das publicações listadas abaixo são as anotadas anteriormente, não datas confirmadas nesta revisão.

**A consulta automatizada desta rodada não confirmou nenhuma regra.** Em 18/10/2026, todas as consultas listadas abaixo falharam no proxy do ambiente antes de chegar ao servidor de origem. Não houve leitura das páginas, confirmação de seu conteúdo, de suas datas de atualização ou da vigência das tarifas. A data desta tentativa de consulta não é uma data de conferência oficial.

Não se atribui o bloqueio à Shopee ou aos sites citados: o resultado observado foi `curl: (56) CONNECT tunnel failed, response 403`, com `http_code=000`. Os cabeçalhos da conexão recusada indicaram `HTTP/1.1 403 Forbidden` e `server: envoy`. A origem não respondeu ao pedido de conteúdo. Não foram contornados proxy, autenticação ou controles de acesso.

## Consultas executadas em 18/10/2026
Método: HTTPS com redirecionamentos habilitados, verificação TLS preservada e limites de conexão e duração. Não foram enviadas credenciais. Para todas as URLs, o status abaixo corresponde ao túnel do proxy, não a uma resposta HTTP do site consultado.

| Tipo e procedência | URL | Resultado observado | Evidência disponível nesta rodada |
| --- | --- | --- | --- |
| Oficial, referência herdada | https://seller.shopee.com.br/edu/article/26839 | CONNECT 403; curl 56; origem não alcançada | Sem leitura; conteúdo e regra não confirmados |
| Oficial, URL completa informada pelo usuário para C1–C4 | https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026 | CONNECT 403; `urlopen` sem resposta da origem | Conteúdo lido nas capturas; vínculo informado pelo usuário, sem comparação online |
| Oficial, referência herdada | https://seller.shopee.com.br/edu/article/18484 | CONNECT 403; curl 56; origem não alcançada | Sem leitura; conteúdo e regra não confirmados |
| Secundária, documento anterior informa 15/10/2026 | https://multdrop.com.br/taxas-da-shopee/ | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, documento anterior informa 07/10/2026 | https://beevix.com.br/blog/taxa-shopee-2026-cnpj-cpf | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, documento anterior informa 16/10/2026 | https://viniensina.com.br/taxa-da-shopee/ | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, documento anterior informa outubro de 2026 | https://hunterhub.com.br/blog/como-vender-na-shopee/ | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, citada no HTML herdado com data 07/10/2026, ausente da lista anterior deste documento | https://www.connectweek.com.br/artigo/margem-por-venda-na-shopee-como-calcular | CONNECT 403; curl 56; origem não alcançada | Citação herdada do HTML; leitura anterior não documentada nem revalidada |

Essas tentativas online não forneceram conteúdo. A evidência visual recebida posteriormente está registrada na seção inicial, separadamente da leitura online bloqueada. As fontes secundárias permanecem sem revalidação.

## Tabela embutida no modelo, cotejada depois com as capturas oficiais
A vigência indicada de 01/10/2026 consta da captura C1; a consulta online permaneceu bloqueada. Os valores abaixo descrevem o modelo implementado, não cobranças exatas de uma conta da Shopee.

- Abaixo de R$ 9 (MEI/CNPJ): comissão 20%, parcela fixa estimada em metade do preço do item.
- R$ 9,00 a R$ 79,99: comissão 20% + R$ 4,50 por item.
- R$ 80,00 a R$ 99,99: comissão 14% + R$ 16 por item.
- R$ 100,00 a R$ 199,99: comissão 14% + R$ 20 por item.
- R$ 200,00 ou mais: comissão 14% + R$ 26 por item.
- CPF com mais de 450 pedidos em 90 dias: adicional indicado de R$ 3 por item nas faixas usuais. Exceção regressiva para preços abaixo de R$ 12 **sem fórmula integral confirmada**.

## Verificação dos dez pontos comerciais — avaliação anterior às capturas
Classificação usada: “confirmado oficialmente” exige leitura verificável de fonte oficial; “corroborado no histórico por fontes secundárias, sem revalidação” descreve apenas o registro anterior; “não confirmado” indica informação ou exceção ainda sem evidência suficiente. Nesta etapa anterior às capturas, nenhum ponto recebeu a classificação “confirmado oficialmente”. Consulte acima o quadro com as evidências visuais recebidas posteriormente.

| Ponto | Modelo ou hipótese existente | Classificação nesta revisão | Pendência antes de autorizar o automático ao público |
| --- | --- | --- | --- |
| 1. Comissões por faixa | 20% abaixo de R$ 80 e 14% a partir de R$ 80, com as parcelas da tabela | Corroborado no histórico por fontes secundárias, sem revalidação | Obter política oficial legível, vigência, limites inclusivos e regra de arredondamento |
| 2. Parcela fixa por item | R$ 4,50 / R$ 16 / R$ 20 / R$ 26 conforme o preço | Corroborado no histórico por fontes secundárias, sem revalidação | Confirmar valores, limites, teto e eventos de incidência |
| 3. MEI/CNPJ | Ambos usam o perfil `cnpj` da calculadora | Não confirmado oficialmente; tratamento equivalente é hipótese do modelo | Confirmar enquadramento, elegibilidade e eventuais condições distintas entre MEI e outros CNPJs |
| 4. CPF até 450 pedidos em 90 dias | Mesma tabela do perfil CNPJ para preços a partir de R$ 12; abaixo disso, automático bloqueado | Não confirmado oficialmente | Confirmar a janela, sua forma de contagem, o limite inclusivo e as condições aplicáveis a esse perfil |
| 5. CPF acima de 450 pedidos em 90 dias | Adicional estimado de R$ 3 por item nas faixas permitidas | Corroborado no histórico por fontes secundárias, sem revalidação | Confirmar valor, critério de pedidos/vendas/unidades, janela e momento em que passa a valer |
| 6. Preços abaixo de R$ 9 | Para MEI/CNPJ, parcela fixa estimada como 50% do preço, somada à comissão de 20% | Corroborado no histórico por fontes secundárias, sem revalidação | Confirmar fórmula, base, arredondamento e limites; o modelo arredonda as parcelas separadamente |
| 7. Regra regressiva de CPF abaixo de R$ 12 | Fórmula integral desconhecida; automático bloqueado para ambos os perfis CPF | Não confirmado | Obter fórmula oficial por perfil e limites; não inferir a regra a partir de exemplos isolados |
| 8. Campanhas e programas | Custos especiais não entram automaticamente; publicidade e tarifas podem ser informadas manualmente | Não confirmado | Confirmar elegibilidade, adicional, base, opt-in, exclusões e se substituem ou acumulam outras tarifas |
| 9. Incidência por item, unidade ou pedido | A ferramenta simula um preço de um item/unidade com parcela fixa aplicada uma vez | Não confirmado oficialmente | Validar pedidos com várias unidades, múltiplos produtos, kits, cancelamentos e devoluções antes de afirmar equivalência com extrato |
| 10. Descontos e mudanças de faixa | O modelo classifica a faixa pelo preço informado/sugerido; não identifica cupom ou subsídio | Não confirmado | Confirmar se a base é preço anunciado ou efetivamente pago, quem financia o desconto e como cada caso afeta a faixa, comissão e parcela fixa |

Os testes automatizados podem validar a matemática sobre essa tabela. Eles não confirmam a política comercial, a equivalência com o extrato de uma conta ou a aplicação da tarifa em todos os cenários acima.

## Lacunas e riscos
- A tarifa regressiva de CPF abaixo de R$ 12 não foi determinada em fonte oficial com fórmula verificável. O cálculo automático foi desabilitado nessa faixa para CPF.
- Campanhas, frete, devoluções, descontos, condições de anúncio, tributos e benefícios individuais podem mudar os custos.
- Há divergências pontuais entre calculadoras de terceiros sobre limites de itens baratos. Não afirmar taxa exata sem conferência na conta.
- O modelo é uma tabela embutida no JavaScript, **não** uma API nem uma verificação em tempo real.
- As capturas sustentam parte da política, sem comprovar validação integral das condições individuais, dos limites ambíguos, de exatamente 450 pedidos, MEI ou arredondamentos. Não anunciar atualização automática nem uma nova data de conferência online oficial.
- A citação histórica de ConnectWeek no HTML não equivale a uma consulta comprovada. Sua inclusão no registro de tentativas acima corrige a divergência de procedência sem atribuir leitura não realizada.

## Diretrizes de implementação
- Manter o modo manual e avisos em linguagem acessível.
- Registrar a data efetiva de cada conferência oficial, preservando links e trechos relevantes sem expor credenciais.
- Antes da publicação, registrar evidência oficial legível para os dez pontos: URL, título, data de leitura, vigência explícita, trecho relevante e restrições de perfil ou campanha. Se a fonte exigir login, a consulta deve ocorrer por acesso autorizado; valores de credenciais não devem entrar neste documento.
- Se as evidências oficiais continuarem indisponíveis, manter a funcionalidade em revisão e o automático claramente identificado como estimativa não confirmada. O modo manual continua útil para simular os valores informados pelo vendedor, sem prometer a cobrança real ou a mesma tarifa para outro preço.
- Manter o PR em rascunho e a página com `noindex,follow` até a aprovação das fontes e dos testes em navegador.
- Não acrescentar ao sitemap nem ao menu antes da revisão e liberação.
- Não integrar à branch principal sem nova autorização explícita.
