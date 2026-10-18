# Pesquisa das tarifas Shopee — tentativa de revalidação em 18/10/2026

## Alcance e procedência
O registro anterior desta pesquisa informa uma comparação da tabela de referência com publicações secundárias que atribuem as regras ao Centro de Educação do Vendedor Shopee. Esse registro não contém cópias ou trechos das páginas que permitam reproduzir a comparação. As datas das publicações listadas abaixo são as anotadas anteriormente, não datas confirmadas nesta revisão.

**Nenhuma regra foi confirmada oficialmente nesta rodada.** Em 18/10/2026, todas as consultas listadas abaixo falharam no proxy do ambiente antes de chegar ao servidor de origem. Não houve leitura das páginas, confirmação de seu conteúdo, de suas datas de atualização ou da vigência das tarifas. A data desta tentativa de consulta não é uma data de conferência oficial.

Não se atribui o bloqueio à Shopee ou aos sites citados: o resultado observado foi `curl: (56) CONNECT tunnel failed, response 403`, com `http_code=000`. Os cabeçalhos da conexão recusada indicaram `HTTP/1.1 403 Forbidden` e `server: envoy`. A origem não respondeu ao pedido de conteúdo. Não foram contornados proxy, autenticação ou controles de acesso.

## Consultas executadas em 18/10/2026
Método: HTTPS com redirecionamentos habilitados, verificação TLS preservada e limites de conexão e duração. Não foram enviadas credenciais. Para todas as URLs, o status abaixo corresponde ao túnel do proxy, não a uma resposta HTTP do site consultado.

| Tipo e procedência | URL | Resultado observado | Evidência disponível nesta rodada |
| --- | --- | --- | --- |
| Oficial, referência herdada | https://seller.shopee.com.br/edu/article/26839 | CONNECT 403; curl 56; origem não alcançada | Sem leitura; conteúdo e regra não confirmados |
| Oficial, referência herdada | https://seller.shopee.com.br/edu/article/18484 | CONNECT 403; curl 56; origem não alcançada | Sem leitura; conteúdo e regra não confirmados |
| Secundária, documento anterior informa 15/10/2026 | https://multdrop.com.br/taxas-da-shopee/ | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, documento anterior informa 07/10/2026 | https://beevix.com.br/blog/taxa-shopee-2026-cnpj-cpf | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, documento anterior informa 16/10/2026 | https://viniensina.com.br/taxa-da-shopee/ | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, documento anterior informa outubro de 2026 | https://hunterhub.com.br/blog/como-vender-na-shopee/ | CONNECT 403; curl 56; origem não alcançada | Registro histórico, sem revalidação |
| Secundária, citada no HTML herdado com data 07/10/2026, ausente da lista anterior deste documento | https://www.connectweek.com.br/artigo/margem-por-venda-na-shopee-como-calcular | CONNECT 403; curl 56; origem não alcançada | Citação herdada do HTML; leitura anterior não documentada nem revalidada |

Não há nesta revisão trecho de conteúdo externo que possa ser apresentado como evidência comercial lida. A documentação de uma URL e de uma tentativa de consulta não confirma a informação atribuída àquela página.

## Tabela embutida no modelo, ainda não confirmada oficialmente
A vigência indicada de 01/10/2026 faz parte da referência herdada e não foi confirmada nesta rodada. Os valores abaixo descrevem o modelo implementado, não cobranças exatas da Shopee.

- Abaixo de R$ 9 (MEI/CNPJ): comissão 20%, parcela fixa estimada em metade do preço do item.
- R$ 9,00 a R$ 79,99: comissão 20% + R$ 4,50 por item.
- R$ 80,00 a R$ 99,99: comissão 14% + R$ 16 por item.
- R$ 100,00 a R$ 199,99: comissão 14% + R$ 20 por item.
- R$ 200,00 ou mais: comissão 14% + R$ 26 por item.
- CPF com mais de 450 pedidos em 90 dias: adicional indicado de R$ 3 por item nas faixas usuais. Exceção regressiva para preços abaixo de R$ 12 **sem fórmula integral confirmada**.

## Verificação dos dez pontos comerciais
Classificação usada: “confirmado oficialmente” exige leitura verificável de fonte oficial; “corroborado no histórico por fontes secundárias, sem revalidação” descreve apenas o registro anterior; “não confirmado” indica informação ou exceção ainda sem evidência suficiente. Nenhum ponto abaixo recebeu a classificação “confirmado oficialmente”.

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
- A evidência disponível nesta rodada não sustenta anunciar tarifas como “oficiais”, “confirmadas”, “atualizadas automaticamente” ou com uma nova data de conferência oficial.
- A citação histórica de ConnectWeek no HTML não equivale a uma consulta comprovada. Sua inclusão no registro de tentativas acima corrige a divergência de procedência sem atribuir leitura não realizada.

## Diretrizes de implementação
- Manter o modo manual e avisos em linguagem acessível.
- Registrar a data efetiva de cada conferência oficial, preservando links e trechos relevantes sem expor credenciais.
- Antes da publicação, registrar evidência oficial legível para os dez pontos: URL, título, data de leitura, vigência explícita, trecho relevante e restrições de perfil ou campanha. Se a fonte exigir login, a consulta deve ocorrer por acesso autorizado; valores de credenciais não devem entrar neste documento.
- Se as evidências oficiais continuarem indisponíveis, manter a funcionalidade em revisão e o automático claramente identificado como estimativa não confirmada. O modo manual continua útil para simular os valores informados pelo vendedor, sem prometer a cobrança real ou a mesma tarifa para outro preço.
- Manter o PR em rascunho e a página com `noindex,follow` até a aprovação das fontes e dos testes em navegador.
- Não acrescentar ao sitemap nem ao menu antes da revisão e liberação.
- Não integrar à branch principal sem nova autorização explícita.
