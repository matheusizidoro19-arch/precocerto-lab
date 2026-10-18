# Lucro no Azul — regras de desenvolvimento

## Projeto
- Produção: https://lucronoazul.com.br/
- Repositório: matheusizidoro19-arch/precocerto-lab
- Hospedagem: GitHub Pages, branch main, raiz do projeto.
- Stack: HTML, CSS e JavaScript nativos, sem backend.
- Produto atual: Kit PreçoCerto v1 via Kiwify. Preserve o nome até migração coordenada.

## Segurança, manutenção e publicação
- Inicie com diagnóstico de leitura e prefira a menor alteração que resolva um problema comprovado.
- Não altere diretamente a branch main; proponha alterações numa branch e em pull request.
- Não faça merge nem publique sem autorização explícita.
- Preserve os links públicos, CNAME, robots.txt, sitemap.xml, tags canonical, arquivos de verificação, URLs e IDs utilizados pelos scripts.
- Não altere fórmulas, layouts, checkout, rastreamento ou CSS de impressão sem testes relevantes.
- Preserve a privacidade dos dados digitados no gerador de orçamento. Não envie conteúdo de formulários ou dados pessoais ao GA4.
- Preserve o banner de consentimento; não dispare purchase a partir de clique, boleto ou Pix não pago.
- Não acrescente comentários nos arquivos HTML, CSS ou JavaScript de produção.
- Não publique menções a ferramentas de geração automatizada na interface; mantenha os textos em português brasileiro.
- Não adicione frameworks, Docker, plugins ou dependências globais sem justificativa e autorização.

## Verificações
Na raiz, execute `node --test tests/*.test.cjs` usando Node.js 22 ou superior.

Os testes conferem as regras das calculadoras, o simulador de descontos, o orçamento, as referências locais e URLs de SEO. Eles não substituem testes em navegador real, impressão PDF nem pagamento aprovado na Kiwify.

## Procedimento
1. Leia o código existente e o diff.
2. Descreva benefício, evidência, risco e arquivos afetados.
3. Implemente a mudança mínima em branch isolada e execute testes.
4. Revise comportamentos, validação de entradas, privacidade, acessibilidade e SEO.
5. Abra pull request; não faça merge sem aprovação.
6. Informe o que foi testado e o que ainda está pendente.

Não crie funcionalidades apenas por novidade. Priorize estabilidade e dados reais de uso e pesquisa.
