# Catálogo de Roupas — Guia rápido para o lojista

## O que tem em cada arquivo

| Arquivo | Para que serve | Você precisa editar? |
|---|---|---|
| `index.html` | Página inicial da loja | Não |
| `produto.html` | Página de detalhes de cada produto | Não |
| `admin.html` + `admin.js` | Painel para você mesmo cadastrar produtos | Não (só usar) |
| `style.css` | Visual (cores, fontes, layout) | Só se quiser mudar o design |
| `script.js` | Funcionamento do site | Não |
| `produtos.json` | **Todos os dados dos produtos e da loja** | Sim — de preferência pelo painel admin |
| `fotos/` | Pasta onde ficam as imagens dos produtos | Sim — coloque as fotos aqui |

Você **nunca precisa mexer no HTML, CSS ou JavaScript**. Tudo o que muda no dia a
dia (produtos, preços, fotos, categorias, dados de contato) fica no
`produtos.json`, editado pelo **painel administrativo** (`admin.html`).

## Como abrir o catálogo pela primeira vez

Abrir o `index.html` com duplo clique funciona na maioria dos navegadores, mas o
**Chrome e o Edge bloqueiam por segurança** a leitura do arquivo `produtos.json`
quando a página é aberta assim (você verá um aviso amarelo no topo do site
avisando disso). Duas soluções simples:

1. **Publicar o site de graça (recomendado):** arraste a pasta inteira para o
   [Netlify Drop](https://app.netlify.com/drop) ou suba num serviço como GitHub
   Pages/Vercel. Em segundos você tem um link do tipo `sualoja.netlify.app`
   funcionando perfeitamente, com o painel incluso.
2. **Testar no seu computador:** abra um terminal dentro da pasta do catálogo e
   rode `python3 -m http.server`, depois acesse `http://localhost:8000` no
   navegador.

O Firefox costuma conseguir abrir direto com duplo clique sem esse aviso.

## Painel administrativo (`admin.html`)

- Senha padrão de demonstração: **admin123** — troque assim que possível (veja
  o comentário no topo do arquivo `admin.js`, é só colar o hash SHA-256 de uma
  senha nova).
- No painel você pode: adicionar, editar e excluir produtos; mudar preços,
  estoque (status Disponível/Esgotado) e categorias; enviar fotos direto do
  computador ou celular; editar os dados da loja (nome, WhatsApp, redes
  sociais, logo e banner).
- **As alterações ficam salvas automaticamente no navegador** enquanto você
  trabalha (rascunho). Para os clientes verem as mudanças no site publicado, vá
  na aba **"Salvar / Exportar"** e:
  - Em navegadores como Chrome/Edge no computador, use **"Selecionar e salvar
    produtos.json"** — escolha o arquivo `produtos.json` da pasta do site uma
    vez, e o painel grava direto nele a partir daí.
  - Em qualquer navegador, use **"Baixar produtos.json"** e depois envie esse
    arquivo para o mesmo lugar onde está o site (substituindo o antigo).

## Fotos dos produtos

Você pode:
- Colocar os arquivos de imagem manualmente dentro da pasta `fotos/` e
  referenciar o caminho (ex: `fotos/camisa-azul.jpg`) ao editar o produto; ou
- Fazer upload direto pelo painel administrativo — nesse caso a imagem é salva
  automaticamente dentro do próprio `produtos.json`, sem precisar mexer em
  pasta nenhuma.

## Personalizando o WhatsApp

No painel, em **"Dados da loja"**, informe o número no formato
`55` + DDD + número, sem espaços, traços ou parênteses (ex: `5511999998888`).
Esse número é usado em todos os botões "Comprar pelo WhatsApp" do site, com a
mensagem preenchida automaticamente com o nome do produto escolhido.

## Personalizando cores e fontes

As cores e fontes ficam centralizadas no topo do arquivo `style.css`, dentro do
bloco `:root { ... }` — trocar os valores de `--cor-latao`, `--cor-vinho` etc.
já atualiza o site inteiro.
