/* ==========================================================================
   ATELIÊ NUVEM — CATÁLOGO DE ROUPAS
   script.js — lógica compartilhada por index.html e produto.html

   Este arquivo NUNCA precisa ser editado pelo lojista.
   Todos os produtos vêm do arquivo produtos.json.
   ========================================================================== */

/* --------------------------------------------------------------------------
   0. ESTADO GLOBAL
   -------------------------------------------------------------------------- */
const Estado = {
  loja: null,
  categorias: [],
  produtos: [],
  filtros: {
    termo: '',
    categoria: 'Todos',
    cor: null,
    tamanho: null,
    precoMax: null
  }
};

const CHAVE_FAVORITOS = 'atelie_favoritos';
const CHAVE_TEMA = 'atelie_tema';

/* --------------------------------------------------------------------------
   1. CARREGAMENTO DOS DADOS (produtos.json)
   -------------------------------------------------------------------------- */

/**
 * Carrega produtos.json. Se o arquivo tiver sido editado pelo painel
 * administrativo (que grava um rascunho no localStorage), esse rascunho
 * mais recente é priorizado; caso contrário busca o arquivo produtos.json.
 */
async function carregarDados() {
  // 1) Tenta usar um rascunho salvo pelo painel admin (mais recente que o arquivo)
  const rascunho = localStorage.getItem('atelie_produtos_rascunho');

  try {
    const resposta = await fetch('produtos.json', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Falha ao buscar produtos.json');
    const dados = await resposta.json();

    // Se existir rascunho mais novo salvo pelo admin, usa ele por cima
    if (rascunho) {
      try { return JSON.parse(rascunho); } catch (e) { /* ignora rascunho corrompido */ }
    }
    return dados;
  } catch (erro) {
    // Provável bloqueio de CORS ao abrir o index.html direto (file://) no Chrome/Edge.
    console.warn('Não foi possível carregar produtos.json via fetch:', erro);
    mostrarAvisoServidor();

    if (rascunho) {
      try { return JSON.parse(rascunho); } catch (e) { /* segue para dados de exemplo */ }
    }
    return null;
  }
}

/** Exibe um aviso explicando por que o catálogo pode não ter carregado (restrição do navegador) */
function mostrarAvisoServidor() {
  const alvo = document.getElementById('area-aviso');
  if (!alvo) return;
  alvo.innerHTML = `
    <div class="aviso-servidor container">
      <strong>Não foi possível carregar os produtos automaticamente.</strong><br>
      Isso acontece porque alguns navegadores (como o Chrome) bloqueiam a leitura de arquivos
      locais quando o <code>index.html</code> é aberto diretamente com duplo clique.<br><br>
      <strong>Como resolver:</strong> hospede a pasta gratuitamente em um serviço como
      Netlify, Vercel ou GitHub Pages (basta arrastar a pasta), ou rode um servidor local,
      por exemplo abrindo um terminal nesta pasta e executando
      <code>python -m http.server</code> e depois acessando <code>http://localhost:8000</code>.
    </div>`;
}

/* --------------------------------------------------------------------------
   2. FUNÇÕES UTILITÁRIAS REUTILIZÁVEIS
   -------------------------------------------------------------------------- */

/** Formata número para moeda brasileira */
function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Monta o link do WhatsApp com mensagem pré-preenchida para um produto */
function linkWhatsApp(numero, produto, extra = '') {
  const mensagem = `Olá, tenho interesse no produto ${produto.nome} (código ${produto.codigo}).${extra}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Lê a lista de códigos favoritados do localStorage */
function obterFavoritos() {
  try { return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || []; }
  catch { return []; }
}

/** Alterna um produto na lista de favoritos e devolve o novo estado (true = favoritado) */
function alternarFavorito(codigo) {
  let favoritos = obterFavoritos();
  const jaTem = favoritos.includes(codigo);
  favoritos = jaTem ? favoritos.filter(c => c !== codigo) : [...favoritos, codigo];
  localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
  atualizarContadorFavoritos();
  return !jaTem;
}

function atualizarContadorFavoritos() {
  const contador = document.getElementById('contador-favoritos');
  if (contador) {
    const qtd = obterFavoritos().length;
    contador.textContent = qtd;
    contador.style.display = qtd > 0 ? 'flex' : 'none';
  }
}

/** Pega o produto pelo código dentro do Estado carregado */
function encontrarProdutoPorCodigo(codigo) {
  return Estado.produtos.find(p => p.codigo === codigo);
}

/** Retorna a primeira imagem válida de um produto (com fallback visual) */
function imagemPrincipal(produto) {
  return (produto.imagens && produto.imagens[0]) || 'fotos/sem-imagem.jpg';
}

/** Exibe uma mensagem rápida (toast) na tela */
function mostrarToast(texto) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = texto;
  toast.classList.add('visivel');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('visivel'), 2600);
}

/* --------------------------------------------------------------------------
   3. MODO CLARO / ESCURO
   -------------------------------------------------------------------------- */
function iniciarModoEscuro() {
  const salvo = localStorage.getItem(CHAVE_TEMA);
  const prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const ativarEscuro = salvo ? salvo === 'escuro' : prefereEscuro;
  document.body.classList.toggle('modo-escuro', ativarEscuro);
  atualizarIconeTema();

  const botao = document.getElementById('botao-tema');
  if (botao) {
    botao.addEventListener('click', () => {
      document.body.classList.toggle('modo-escuro');
      localStorage.setItem(CHAVE_TEMA, document.body.classList.contains('modo-escuro') ? 'escuro' : 'claro');
      atualizarIconeTema();
    });
  }
}

function atualizarIconeTema() {
  const botao = document.getElementById('botao-tema');
  if (!botao) return;
  const escuro = document.body.classList.contains('modo-escuro');
  botao.innerHTML = escuro
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
}

/* --------------------------------------------------------------------------
   4. BOTÃO VOLTAR AO TOPO + REVEAL AO ROLAR
   -------------------------------------------------------------------------- */
function iniciarBotaoTopo() {
  const botao = document.getElementById('botao-topo');
  if (!botao) return;
  window.addEventListener('scroll', () => {
    botao.classList.toggle('visivel', window.scrollY > 500);
  });
  botao.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/** Observa elementos com classe .revelar e adiciona .visivel quando entram na tela */
function iniciarRevelarAoRolar(seletor = '.revelar') {
  const elementos = document.querySelectorAll(seletor);
  if (!('IntersectionObserver' in window)) {
    elementos.forEach(el => el.classList.add('visivel'));
    return;
  }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visivel');
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.12 });
  elementos.forEach(el => observador.observe(el));
}

/* --------------------------------------------------------------------------
   5. RENDERIZAÇÃO DO CARTÃO DE PRODUTO (reutilizado em várias seções)
   -------------------------------------------------------------------------- */
function criarCartaoProduto(produto) {
  const esgotado = produto.status === 'Esgotado';
  const temPromocao = produto.precoPromocional && produto.precoPromocional < produto.preco;
  const favoritado = obterFavoritos().includes(produto.codigo);

  const etiquetasHtml = (produto.etiquetas || []).map(et => {
    const classe = 'etiqueta-' + et.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    return `<span class="etiqueta ${classe}">${et}</span>`;
  }).join('') + (esgotado ? '<span class="etiqueta etiqueta-esgotado">Esgotado</span>' : '');

  const precosHtml = temPromocao
    ? `<span class="preco-atual promocional">${formatarPreco(produto.precoPromocional)}</span><span class="preco-riscado">${formatarPreco(produto.preco)}</span>`
    : `<span class="preco-atual">${formatarPreco(produto.preco)}</span>`;

  const cartao = document.createElement('article');
  cartao.className = 'cartao-produto revelar';
  cartao.innerHTML = `
    <div class="cartao-imagem">
      <div class="etiquetas-produto">${etiquetasHtml}</div>
      <button class="botao-favorito ${favoritado ? 'ativo' : ''}" data-codigo="${produto.codigo}" aria-label="Favoritar produto" title="Favoritar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${favoritado ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>
        </svg>
      </button>
      ${esgotado ? '<div class="cartao-esgotado-overlay">Esgotado</div>' : ''}
      <img src="${imagemPrincipal(produto)}" alt="${produto.nome}" loading="lazy" onerror="this.src='fotos/sem-imagem.jpg'">
    </div>
    <div class="cartao-info">
      <span class="cartao-categoria">${produto.categoria}</span>
      <h3 class="cartao-nome">${produto.nome}</h3>
      <div class="cartao-precos">${precosHtml}</div>
      <div class="cartao-acoes">
        <a class="botao botao-secundario" href="produto.html?codigo=${encodeURIComponent(produto.codigo)}">Ver detalhes</a>
        ${!esgotado ? `<a class="botao botao-whatsapp" target="_blank" rel="noopener" href="${linkWhatsApp(Estado.loja.whatsapp, produto)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.1 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5-.1.5-.2 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.1-.4-.2z"/></svg>
          Comprar
        </a>` : ''}
      </div>
    </div>`;
  return cartao;
}

function renderizarGrade(elementoId, listaProdutos, mensagemVazio = 'Nenhum produto encontrado.') {
  const container = document.getElementById(elementoId);
  if (!container) return;
  container.innerHTML = '';
  if (listaProdutos.length === 0) {
    container.innerHTML = `<p class="resultado-vazio">${mensagemVazio}</p>`;
    return;
  }
  const fragmento = document.createDocumentFragment();
  listaProdutos.forEach(p => fragmento.appendChild(criarCartaoProduto(p)));
  container.appendChild(fragmento);
  iniciarRevelarAoRolar('#' + elementoId + ' .revelar');
  ligarBotoesFavoritos();
}

function ligarBotoesFavoritos() {
  document.querySelectorAll('.botao-favorito, .botao-favorito-detalhe').forEach(botao => {
    botao.onclick = (e) => {
      e.preventDefault();
      const codigo = botao.dataset.codigo;
      const agora = alternarFavorito(codigo);
      botao.classList.toggle('ativo', agora);
      const svg = botao.querySelector('svg');
      if (svg) svg.setAttribute('fill', agora ? 'currentColor' : 'none');
      mostrarToast(agora ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    };
  });
}

/* --------------------------------------------------------------------------
   6. BUSCA E FILTROS (usados na página inicial)
   -------------------------------------------------------------------------- */
function aplicarFiltros() {
  const { termo, categoria, cor, tamanho, precoMax } = Estado.filtros;

  let resultado = Estado.produtos.filter(p => {
    const precoConsiderado = p.precoPromocional || p.preco;
    const bateTermo = !termo ||
      p.nome.toLowerCase().includes(termo) ||
      p.categoria.toLowerCase().includes(termo) ||
      p.codigo.toLowerCase().includes(termo);
    const bateCategoria = categoria === 'Todos' || p.categoria === categoria;
    const bateCor = !cor || p.cores.includes(cor);
    const bateTamanho = !tamanho || p.tamanhos.includes(tamanho);
    const batePreco = !precoMax || precoConsiderado <= precoMax;
    return bateTermo && bateCategoria && bateCor && bateTamanho && batePreco;
  });

  renderizarGrade('grade-todos-produtos', resultado, 'Nenhum produto encontrado com esses filtros.');
}

function iniciarBusca() {
  const input = document.getElementById('campo-busca');
  if (!input) return;
  input.addEventListener('input', () => {
    Estado.filtros.termo = input.value.trim().toLowerCase();
    aplicarFiltros();
  });
}

function iniciarFiltros() {
  // Categorias no menu superior
  const menu = document.getElementById('menu-categorias');
  if (menu) {
    menu.innerHTML = ['Todos', ...Estado.categorias].map(cat =>
      `<button data-cat="${cat}" class="${cat === 'Todos' ? 'ativo' : ''}">${cat}</button>`
    ).join('');
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      menu.querySelectorAll('button').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      Estado.filtros.categoria = btn.dataset.cat;
      const seletorCategoria = document.getElementById('filtro-categoria');
      if (seletorCategoria) seletorCategoria.value = btn.dataset.cat;
      aplicarFiltros();
      document.getElementById('todos-produtos')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Select de categoria dentro da barra de filtros
  const seletorCategoria = document.getElementById('filtro-categoria');
  if (seletorCategoria) {
    seletorCategoria.innerHTML = ['Todos', ...Estado.categorias].map(c => `<option value="${c}">${c}</option>`).join('');
    seletorCategoria.addEventListener('change', () => {
      Estado.filtros.categoria = seletorCategoria.value;
      menu?.querySelectorAll('button').forEach(b => b.classList.toggle('ativo', b.dataset.cat === seletorCategoria.value));
      aplicarFiltros();
    });
  }

  // Cores (chips)
  const coresUnicas = [...new Set(Estado.produtos.flatMap(p => p.cores))].sort();
  const grupoCores = document.getElementById('filtro-cores');
  if (grupoCores) {
    grupoCores.innerHTML = coresUnicas.map(c => `<button class="chip" data-cor="${c}">${c}</button>`).join('');
    grupoCores.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const jaAtivo = chip.classList.contains('selecionado');
      grupoCores.querySelectorAll('.chip').forEach(c => c.classList.remove('selecionado'));
      Estado.filtros.cor = jaAtivo ? null : chip.dataset.cor;
      if (!jaAtivo) chip.classList.add('selecionado');
      aplicarFiltros();
    });
  }

  // Tamanhos (chips)
  const tamanhosUnicos = [...new Set(Estado.produtos.flatMap(p => p.tamanhos))];
  const grupoTamanhos = document.getElementById('filtro-tamanhos');
  if (grupoTamanhos) {
    grupoTamanhos.innerHTML = tamanhosUnicos.map(t => `<button class="chip" data-tam="${t}">${t}</button>`).join('');
    grupoTamanhos.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const jaAtivo = chip.classList.contains('selecionado');
      grupoTamanhos.querySelectorAll('.chip').forEach(c => c.classList.remove('selecionado'));
      Estado.filtros.tamanho = jaAtivo ? null : chip.dataset.tam;
      if (!jaAtivo) chip.classList.add('selecionado');
      aplicarFiltros();
    });
  }

  // Faixa de preço
  const faixaPreco = document.getElementById('filtro-preco');
  const rotuloPreco = document.getElementById('rotulo-preco');
  if (faixaPreco) {
    const precoMaximoGeral = Math.ceil(Math.max(...Estado.produtos.map(p => p.preco)) / 10) * 10;
    faixaPreco.max = precoMaximoGeral;
    faixaPreco.value = precoMaximoGeral;
    rotuloPreco.textContent = formatarPreco(precoMaximoGeral);
    faixaPreco.addEventListener('input', () => {
      Estado.filtros.precoMax = Number(faixaPreco.value);
      rotuloPreco.textContent = formatarPreco(Number(faixaPreco.value));
      aplicarFiltros();
    });
  }

  // Botão limpar filtros
  const botaoLimpar = document.getElementById('limpar-filtros');
  if (botaoLimpar) {
    botaoLimpar.addEventListener('click', () => {
      Estado.filtros = { termo: '', categoria: 'Todos', cor: null, tamanho: null, precoMax: null };
      document.getElementById('campo-busca').value = '';
      if (faixaPreco) { faixaPreco.value = faixaPreco.max; rotuloPreco.textContent = formatarPreco(Number(faixaPreco.max)); }
      document.querySelectorAll('.chip.selecionado').forEach(c => c.classList.remove('selecionado'));
      seletorCategoria && (seletorCategoria.value = 'Todos');
      menu?.querySelectorAll('button').forEach(b => b.classList.toggle('ativo', b.dataset.cat === 'Todos'));
      aplicarFiltros();
    });
  }
}

/* --------------------------------------------------------------------------
   7. INICIALIZAÇÃO DA PÁGINA INICIAL (index.html)
   -------------------------------------------------------------------------- */
async function iniciarPaginaInicial() {
  const dados = await carregarDados();
  if (!dados) { esconderCarregamento(); return; }

  Estado.loja = dados.loja;
  Estado.categorias = dados.categorias || [];
  Estado.produtos = dados.produtos || [];

  preencherInfoLoja();

  renderizarGrade('grade-destaques', Estado.produtos.filter(p => p.destaque));
  renderizarGrade('grade-promocoes', Estado.produtos.filter(p => p.precoPromocional && p.precoPromocional < p.preco));
  renderizarGrade('grade-todos-produtos', Estado.produtos);

  iniciarBusca();
  iniciarFiltros();
  atualizarContadorFavoritos();
  iniciarRevelarAoRolar();
  esconderCarregamento();
}

function preencherInfoLoja() {
  if (!Estado.loja) return;
  document.querySelectorAll('[data-loja-nome]').forEach(el => el.textContent = Estado.loja.nome);
  document.querySelectorAll('[data-loja-slogan]').forEach(el => el.textContent = Estado.loja.slogan);
  document.querySelectorAll('[data-loja-logo]').forEach(el => el.src = Estado.loja.logo);
  document.querySelectorAll('[data-loja-banner]').forEach(el => el.src = Estado.loja.banner);
  document.querySelectorAll('[data-loja-email]').forEach(el => el.textContent = Estado.loja.email);
  document.querySelectorAll('[data-loja-endereco]').forEach(el => el.textContent = Estado.loja.endereco);
  document.querySelectorAll('[data-loja-instagram]').forEach(el => el.href = Estado.loja.instagram);
  document.querySelectorAll('[data-loja-facebook]').forEach(el => el.href = Estado.loja.facebook);
  document.querySelectorAll('[data-loja-whatsapp]').forEach(el => el.href = `https://wa.me/${Estado.loja.whatsapp}`);
  document.querySelectorAll('[data-loja-whatsapp-flutuante]').forEach(el =>
    el.href = `https://wa.me/${Estado.loja.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo catálogo online e gostaria de mais informações.')}`);
  document.title = Estado.loja.nome + ' — Catálogo Online';
}

function esconderCarregamento() {
  document.getElementById('tela-carregamento')?.classList.add('escondida');
}

/* --------------------------------------------------------------------------
   8. INICIALIZAÇÃO DA PÁGINA DE DETALHES (produto.html)
   -------------------------------------------------------------------------- */
async function iniciarPaginaProduto() {
  const dados = await carregarDados();
  if (!dados) { esconderCarregamento(); return; }

  Estado.loja = dados.loja;
  Estado.categorias = dados.categorias || [];
  Estado.produtos = dados.produtos || [];
  preencherInfoLoja();

  const parametros = new URLSearchParams(window.location.search);
  const codigo = parametros.get('codigo');
  const produto = encontrarProdutoPorCodigo(codigo);

  const area = document.getElementById('area-produto');
  if (!produto) {
    area.innerHTML = '<p class="resultado-vazio">Produto não encontrado. <a href="index.html">Voltar ao catálogo</a></p>';
    esconderCarregamento();
    return;
  }

  renderizarDetalheProduto(produto);
  atualizarContadorFavoritos();
  iniciarRevelarAoRolar();
  esconderCarregamento();
}

let tamanhoSelecionado = null;
let corSelecionada = null;

function renderizarDetalheProduto(produto) {
  document.title = `${produto.nome} — ${Estado.loja.nome}`;
  tamanhoSelecionado = produto.tamanhos[0] || null;
  corSelecionada = produto.cores[0] || null;

  const esgotado = produto.status === 'Esgotado';
  const temPromocao = produto.precoPromocional && produto.precoPromocional < produto.preco;
  const economia = temPromocao ? Math.round(100 - (produto.precoPromocional / produto.preco) * 100) : 0;
  const favoritado = obterFavoritos().includes(produto.codigo);

  document.getElementById('trilha-nome-produto').textContent = produto.nome;

  const area = document.getElementById('area-produto');
  area.innerHTML = `
    <div class="galeria-coluna">
      <div class="galeria-principal" id="galeria-principal">
        <img id="imagem-principal" src="${imagemPrincipal(produto)}" alt="${produto.nome}" onerror="this.src='fotos/sem-imagem.jpg'">
        <span class="dica-zoom">Passe o mouse para dar zoom</span>
      </div>
      <div class="galeria-miniaturas" id="galeria-miniaturas">
        ${produto.imagens.map((img, i) => `<img src="${img}" class="${i === 0 ? 'ativa' : ''}" data-src="${img}" alt="${produto.nome} - imagem ${i + 1}" loading="lazy" onerror="this.src='fotos/sem-imagem.jpg'">`).join('')}
      </div>
    </div>
    <div class="produto-info-completa revelar">
      <span class="eyebrow">${produto.categoria} · Código ${produto.codigo}</span>
      <h1>${produto.nome}</h1>
      <div class="precos-detalhe">
        ${temPromocao
          ? `<span class="preco-atual promocional">${formatarPreco(produto.precoPromocional)}</span><span class="preco-riscado">${formatarPreco(produto.preco)}</span><span class="economia-badge">-${economia}%</span>`
          : `<span class="preco-atual">${formatarPreco(produto.preco)}</span>`}
      </div>
      <div class="status-disponibilidade ${esgotado ? 'status-esgotado' : 'status-disponivel'}">
        <span class="bolinha-status"></span> ${esgotado ? 'Esgotado' : 'Disponível em estoque'}
      </div>
      <p class="produto-descricao">${produto.descricao}</p>

      <div class="seletor-bloco">
        <div class="seletor-titulo"><span>Tamanho</span></div>
        <div class="opcoes-lista" id="lista-tamanhos">
          ${produto.tamanhos.map((t, i) => `<button class="opcao-tamanho ${i === 0 ? 'selecionado' : ''}" data-valor="${t}">${t}</button>`).join('')}
        </div>
      </div>

      <div class="seletor-bloco">
        <div class="seletor-titulo"><span>Cor</span></div>
        <div class="opcoes-lista" id="lista-cores">
          ${produto.cores.map((c, i) => `<button class="opcao-cor ${i === 0 ? 'selecionado' : ''}" data-valor="${c}">${c}</button>`).join('')}
        </div>
      </div>

      <div class="acoes-detalhe">
        ${!esgotado ? `<a class="botao botao-whatsapp" id="botao-comprar-whatsapp" target="_blank" rel="noopener">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2z"/></svg>
          Comprar pelo WhatsApp
        </a>` : `<button class="botao botao-secundario" disabled style="flex:1">Produto esgotado</button>`}
        <button class="botao-favorito-detalhe ${favoritado ? 'ativo' : ''}" data-codigo="${produto.codigo}" aria-label="Favoritar" title="Favoritar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${favoritado ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>
          </svg>
        </button>
        <button class="botao-compartilhar" id="botao-compartilhar" aria-label="Compartilhar" title="Compartilhar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>
          </svg>
        </button>
      </div>
    </div>`;

  ligarEventosDetalhe(produto);
  renderizarGrade('grade-relacionados', produtosRelacionados(produto), 'Sem produtos relacionados no momento.');
}

function ligarEventosDetalhe(produto) {
  // Troca de imagem na galeria
  document.querySelectorAll('#galeria-miniaturas img').forEach(mini => {
    mini.addEventListener('click', () => {
      document.getElementById('imagem-principal').src = mini.dataset.src;
      document.querySelectorAll('#galeria-miniaturas img').forEach(m => m.classList.remove('ativa'));
      mini.classList.add('ativa');
    });
  });

  // Zoom na imagem principal — no computador segue o mouse; no celular, toque para ampliar/reduzir
  const galeria = document.getElementById('galeria-principal');
  const imgPrincipal = document.getElementById('imagem-principal');
  const ehTelaTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  if (!ehTelaTouch) {
    galeria.addEventListener('mousemove', (e) => {
      const retangulo = galeria.getBoundingClientRect();
      const x = ((e.clientX - retangulo.left) / retangulo.width) * 100;
      const y = ((e.clientY - retangulo.top) / retangulo.height) * 100;
      imgPrincipal.style.transformOrigin = `${x}% ${y}%`;
      galeria.classList.add('ampliado');
    });
    galeria.addEventListener('mouseleave', () => galeria.classList.remove('ampliado'));
  } else {
    // No celular: primeiro toque amplia (centralizado no ponto tocado), segundo toque reduz
    galeria.querySelector('.dica-zoom').textContent = 'Toque para dar zoom';
    galeria.addEventListener('click', (e) => {
      if (galeria.classList.contains('ampliado')) {
        galeria.classList.remove('ampliado');
        return;
      }
      const retangulo = galeria.getBoundingClientRect();
      const toque = e.touches?.[0] || e;
      const x = ((toque.clientX - retangulo.left) / retangulo.width) * 100;
      const y = ((toque.clientY - retangulo.top) / retangulo.height) * 100;
      imgPrincipal.style.transformOrigin = `${x}% ${y}%`;
      galeria.classList.add('ampliado');
    });
  }

  // Seleção de tamanho
  document.getElementById('lista-tamanhos')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.opcao-tamanho');
    if (!btn) return;
    document.querySelectorAll('.opcao-tamanho').forEach(b => b.classList.remove('selecionado'));
    btn.classList.add('selecionado');
    tamanhoSelecionado = btn.dataset.valor;
    atualizarLinkComprar(produto);
  });

  // Seleção de cor
  document.getElementById('lista-cores')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.opcao-cor');
    if (!btn) return;
    document.querySelectorAll('.opcao-cor').forEach(b => b.classList.remove('selecionado'));
    btn.classList.add('selecionado');
    corSelecionada = btn.dataset.valor;
    atualizarLinkComprar(produto);
  });

  atualizarLinkComprar(produto);

  // Favoritar
  ligarBotoesFavoritos();

  // Compartilhar
  document.getElementById('botao-compartilhar')?.addEventListener('click', () => abrirModalCompartilhar(produto));
}

/** Atualiza o link de compra do WhatsApp incluindo tamanho e cor escolhidos */
function atualizarLinkComprar(produto) {
  const link = document.getElementById('botao-comprar-whatsapp');
  if (!link) return;
  const extra = ` Tamanho: ${tamanhoSelecionado}. Cor: ${corSelecionada}.`;
  link.href = linkWhatsApp(Estado.loja.whatsapp, produto, extra);
}

/** Sugere até 4 produtos da mesma categoria (excluindo o produto atual) */
function produtosRelacionados(produto) {
  return Estado.produtos
    .filter(p => p.categoria === produto.categoria && p.codigo !== produto.codigo)
    .slice(0, 4);
}

/* --------------------------------------------------------------------------
   9. COMPARTILHAR PRODUTO (modal com link + redes)
   -------------------------------------------------------------------------- */
function abrirModalCompartilhar(produto) {
  const modal = document.getElementById('modal-compartilhar');
  if (!modal) return;
  const url = window.location.href;
  const texto = `Confira ${produto.nome} no catálogo da ${Estado.loja.nome}!`;

  document.getElementById('opcoes-compartilhar').innerHTML = `
    <button id="copiar-link">Copiar link</button>
    <a href="https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook</a>
    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">Twitter/X</a>`;

  document.getElementById('copiar-link').addEventListener('click', () => {
    navigator.clipboard?.writeText(url).then(() => mostrarToast('Link copiado!'));
  });

  modal.classList.add('aberto');
}

function iniciarModais() {
  document.querySelectorAll('[data-fechar-modal]').forEach(el => {
    el.addEventListener('click', () => el.closest('.modal-fundo')?.classList.remove('aberto'));
  });
  document.querySelectorAll('.modal-fundo').forEach(modal => {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('aberto'); });
  });
}

/* --------------------------------------------------------------------------
   10. PONTO DE ENTRADA
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  iniciarModoEscuro();
  iniciarBotaoTopo();
  iniciarModais();

  const pagina = document.body.dataset.pagina;
  if (pagina === 'inicial') iniciarPaginaInicial();
  if (pagina === 'produto') iniciarPaginaProduto();
});
