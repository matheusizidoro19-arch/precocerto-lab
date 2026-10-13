# PreçoCerto Lab 2.4.2 — revisão controlada

Base: ZIP original v2.4. Nenhuma página nova foi criada, e nenhum endereço existente mudou.

## Correções

- Resultados antigos são limpos quando os dados das calculadoras ficam inválidos.
- Prévia do orçamento não exibe um total antigo quando quantidade, preço ou desconto estão incorretos.
- Quantidade de orçamento inferior a 0,01 passa a ser recusada na prévia.
- Cálculos que ultrapassam valores numéricos finitos são recusados.
- A entrada da página inicial no sitemap foi padronizada com sua URL canônica (`/precocerto-lab/`).
- Foram incluídas informações Open Graph e imagens de compartilhamento, sem alterar o visual.
- O `app.js` utiliza uma versão de URL para evitar que navegadores mantenham uma cópia antiga.

## Mantido

- Quatro ferramentas e três artigos existentes.
- Nomes de arquivos e URLs das páginas `.html`.
- Layout, CSS de impressão e criação de orçamento em PDF pelo navegador.
- Sem rastreamento, coleta de feedback ou captura de e-mail.
- Arquivo do Google Search Console: mantenha o que já está no repositório ao publicar.

## Antes de publicar

Teste no navegador a impressão em PDF e a aparência em celular, porque a automatização de navegador não pôde executar neste ambiente. Faça uma cópia do estado atual do repositório. O status de sitemap do Google Search Console não é automaticamente corrigido por esta versão.
