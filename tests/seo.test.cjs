const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://lucronoazul.com.br';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#39|#\d+|#x[\da-f]+);/gi, entity => {
  const named = {'&amp;':'&', '&quot;':'"', '&apos;':"'", '&lt;':'<', '&gt;':'>', '&#39;':"'"};
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  return String.fromCodePoint(parseInt(entity.slice(2, -1).replace(/^x/i, ''), /^&#x/i.test(entity) ? 16 : 10));
});
const plain = value => decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = value => Object.fromEntries([...value.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
  .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
const tags = (html, tag) => [...html.matchAll(new RegExp('<'+tag+'\\b([^>]*)>', 'gi'))].map(match => attrs(match[1]));
const elements = (html, tag) => [...html.matchAll(new RegExp('<'+tag+'\\b([^>]*)>([\\s\\S]*?)</'+tag+'>', 'gi'))]
  .map(match => ({attrs:attrs(match[1]), text:plain(match[2]), html:match[2]}));
const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
const fileFor = url => decodeURIComponent(new URL(url).pathname).replace(/^\//, '') || 'index.html';
const pages = urls.map(url => {
  const html = read(fileFor(url));
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  return {url, file:fileFor(url), html, head, body, main};
});
const metadata = (head, name) => tags(head, 'meta').filter(tag => tag.name === name).map(tag => tag.content);
const localLinks = (html, url) => elements(html, 'a').map(link => new URL(link.attrs.href, url)).filter(link => link.origin === origin);

test('SEO: sitemap XML e TXT concordam, sem URLs duplicadas ou desvios de domínio', () => {
  assert.equal(urls.length, 14);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(read('sitemap.txt').trim().split(/\r?\n/), urls);
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.origin, origin);
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
    assert.ok(fs.existsSync(path.join(root, fileFor(value))), value);
  }
  assert.equal(read('CNAME').trim(), 'lucronoazul.com.br');
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/lucronoazul\.com\.br\/sitemap\.xml\s*$/m);
  assert.doesNotMatch(read('robots.txt'), /^Disallow:\s*\/\s*$/m);
});

test('SEO: títulos e descrições são únicos e preenchidos, com um único H1 por página', () => {
  const titles = new Set(), descriptions = new Set();
  for (const page of pages) {
    assert.ok(page.head && page.body && page.main, page.file);
    const title = elements(page.head, 'title');
    const description = metadata(page.head, 'description');
    const h1 = elements(page.main, 'h1');
    assert.equal(title.length, 1, page.file);
    assert.equal(description.length, 1, page.file);
    assert.equal(h1.length, 1, page.file);
    for (const text of [title[0].text, description[0], h1[0].text]) assert.ok(text.trim(), page.file);
    assert.ok(!titles.has(title[0].text.toLowerCase()), page.file+': título repetido');
    assert.ok(!descriptions.has(description[0].toLowerCase()), page.file+': descrição repetida');
    titles.add(title[0].text.toLowerCase());
    descriptions.add(description[0].toLowerCase());
  }
});

test('SEO: canonical aponta para a própria URL, Open Graph corresponde e não há bloqueio de indexação no HTML', () => {
  for (const page of pages) {
    const canonical = tags(page.head, 'link').filter(tag => tag.rel === 'canonical').map(tag => tag.href);
    assert.deepEqual(canonical, [page.url], page.file);
    const og = tags(page.head, 'meta').filter(tag => tag.property === 'og:url').map(tag => tag.content);
    assert.deepEqual(og, [page.url], page.file);
    const robots = metadata(page.head, 'robots');
    assert.equal(robots.length, 1, page.file);
    assert.ok(robots[0].split(/\s*,\s*/).includes('index'), page.file);
    assert.ok(robots[0].split(/\s*,\s*/).includes('follow'), page.file);
    for (const tag of tags(page.head, 'meta').filter(tag => ['robots','googlebot'].includes(tag.name))) {
      assert.doesNotMatch(tag.content, /\b(?:noindex|nofollow|none)\b/i, page.file);
    }
  }
});

test('SEO: referências locais e âncoras apontam para arquivos e IDs existentes', () => {
  for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
    const html = read(file);
    const base = new URL(file, origin+'/');
    for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
      const attributes = attrs(match[0]);
      for (const ref of [attributes.href, attributes.src].filter(Boolean)) {
        const url = new URL(ref, base);
        if (url.origin !== origin) continue;
        const local = fileFor(url.href);
        assert.ok(fs.existsSync(path.join(root, local)), file+': '+ref);
        if (url.hash && local.endsWith('.html')) {
          const ids = [...read(local).matchAll(/<[a-z][^>]*>/gi)].map(match => attrs(match[0]).id);
          assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), file+': '+ref);
        }
      }
    }
  }
});

test('SEO: todas as páginas do sitemap são alcançáveis por links da página inicial', () => {
  const byFile = new Map(pages.map(page => [page.file, page]));
  const visited = new Set(), queue = ['index.html'];
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file) || !byFile.has(file)) continue;
    visited.add(file);
    queue.push(...localLinks(byFile.get(file).body, byFile.get(file).url).map(link => fileFor(link.href)));
  }
  assert.deepEqual([...visited].sort(), [...byFile.keys()].sort());
});

test('SEO: navegação principal oferece acesso descritivo à Shopee nas 14 páginas', () => {
  for (const page of pages) {
    const navs = elements(page.body, 'nav');
    assert.equal(navs.length, 1, page.file);
    assert.equal(navs[0].attrs['aria-label'], 'Navegação principal', page.file);
    const links = elements(navs[0].html, 'a').filter(link => link.attrs.href === 'shopee-tarifas.html');
    assert.equal(links.length, 1, page.file);
    assert.equal(links[0].text, 'Shopee', page.file);
  }
});

test('SEO: ferramentas e guias têm ligações contextuais nos dois sentidos', () => {
  const destinations = {
    'index.html':['marketplace.html','shopee-tarifas.html','lucro-shopee-mercado-livre.html'],
    'shopee-tarifas.html':['marketplace.html','lucro-shopee-mercado-livre.html'],
    'marketplace.html':['shopee-tarifas.html','lucro-shopee-mercado-livre.html'],
    'lucro-shopee-mercado-livre.html':['shopee-tarifas.html','marketplace.html'],
    'margem-lucro.html':['como-calcular-preco-venda.html'],
    'como-calcular-preco-venda.html':['margem-lucro.html'],
    'impressao-3d.html':['quanto-custa-impressao-3d.html'],
    'quanto-custa-impressao-3d.html':['impressao-3d.html']
  };
  for (const [file, expected] of Object.entries(destinations)) {
    const page = pages.find(page => page.file === file);
    const linked = new Set(localLinks(page.main, page.url).map(link => fileFor(link.href)));
    for (const destination of expected) assert.ok(linked.has(destination), file+' → '+destination);
  }
});

test('SEO: JSON-LD válido descreve as ferramentas e guias usando conteúdo visível', () => {
  const apps = ['impressao-3d.html','margem-lucro.html','marketplace.html','shopee-tarifas.html','orcamento.html'];
  const articles = ['quanto-custa-impressao-3d.html','como-calcular-preco-venda.html','lucro-shopee-mercado-livre.html','desconto-maximo-sem-prejuizo.html'];
  for (const page of pages) {
    const schemas = elements(page.html, 'script').filter(script => script.attrs.type === 'application/ld+json').map(script => JSON.parse(script.html));
    const expected = apps.includes(page.file) ? 'WebApplication' : articles.includes(page.file) ? 'Article' : page.file === 'index.html' ? 'WebSite' : null;
    assert.equal(schemas.length, expected ? 1 : 0, page.file);
    for (const schema of schemas) {
      assert.equal(schema['@context'], 'https://schema.org', page.file);
      assert.equal(schema['@type'], expected, page.file);
      assert.equal(schema.url, page.url, page.file);
      assert.equal(schema.inLanguage, 'pt-BR', page.file);
      assert.ok(schema.description.trim(), page.file);
      if (expected === 'WebSite') {
        assert.equal(schema.name, 'Lucro no Azul');
      } else {
        assert.equal(schema.name ?? schema.headline, elements(page.main, 'h1')[0].text, page.file);
        assert.ok(plain(page.main).includes(schema.description), page.file+': descrição não visível');
      }
      if (expected === 'WebApplication') {
        assert.equal(schema.applicationCategory, 'FinanceApplication', page.file);
        assert.equal(schema.isAccessibleForFree, true, page.file);
      }
      if (expected === 'Article') assert.deepEqual(schema.mainEntityOfPage, {'@type':'WebPage','@id':page.url}, page.file);
    }
  }
});
