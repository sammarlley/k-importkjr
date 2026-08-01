/* ==========================================================================
   ATELIÊ NUVEM — PAINEL ADMINISTRATIVO
   admin.js — permite ao lojista gerenciar o catálogo sem editar código.

   IMPORTANTE SOBRE SEGURANÇA:
   Este login por senha roda inteiramente no navegador (não existe um
   servidor por trás). Isso é suficiente para evitar que um cliente comum
   mexa no painel por engano, mas não é uma segurança forte de verdade
   (alguém com conhecimento técnico poderia contornar). Para uma loja com
   muito acesso, o ideal é futuramente colocar esse painel atrás de um
   login de servidor de verdade.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURAÇÃO DA SENHA
   Para trocar a senha: gere um novo hash SHA-256 da senha desejada (existem
   geradores gratuitos "sha256 online") e substitua o valor abaixo.
   Senha atual configurada: admin123
   -------------------------------------------------------------------------- */
const HASH_SENHA_ADMIN = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

const CHAVE_RASCUNHO = 'atelie_produtos_rascunho';
const CHAVE_SESSAO = 'atelie_admin_logado';

let dados = { loja: {}, categorias: [], produtos: [] };
let imagensEmEdicao = [];      // imagens (base64 ou caminho) do produto sendo criado/editado
let etiquetasEmEdicao = [];    // etiquetas selecionadas do produto sendo criado/editado
let handleArquivoJson = null;  // referência ao arquivo produtos.json (File System Access API)

/* --------------------------------------------------------------------------
   1. AUTENTICAÇÃO
   -------------------------------------------------------------------------- */
async function calcularHash(texto) {
  const bytes = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function tentarLogin() {
  const senha = document.getElementById('campo-senha').value;
  const hash = await calcularHash(senha);
  const erro = document.getElementById('mensagem-erro-login');

  if (hash === HASH_SENHA_ADMIN) {
    sessionStorage.setItem(CHAVE_SESSAO, 'sim');
    abrirPainel();
  } else {
    erro.textContent = 'Senha incorreta. Tente novamente.';
  }
}

function abrirPainel() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('painel-admin').style.display = 'block';
  inicializarPainel();
}

/* --------------------------------------------------------------------------
   2. CARREGAMENTO E RASCUNHO
   -------------------------------------------------------------------------- */
async function carregarDadosAdmin() {
  const rascunho = localStorage.getItem(CHAVE_RASCUNHO);
  if (rascunho) {
    try { return JSON.parse(rascunho); } catch (e) { /* segue para o arquivo original */ }
  }
  try {
    const resposta = await fetch('produtos.json', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('não encontrado');
    return await resposta.json();
  } catch (erro) {
    document.getElementById('secao-produtos').insertAdjacentHTML('afterbegin',
      `<div class="admin-alerta" style="background:color-mix(in srgb, var(--cor-vinho) 15%, var(--cor-superficie))">
        Não foi possível carregar o produtos.json automaticamente (o navegador bloqueia leitura de
        arquivos locais quando a página é aberta com duplo clique). Você pode começar um catálogo
        novo aqui e usar "Baixar produtos.json" para gerar o arquivo, ou hospedar o site para testar
        o painel completo.
      </div>`);
    return { loja: { nome: 'Minha Loja', slogan: '', logo: 'fotos/logo.png', banner: 'fotos/banner.jpg', whatsapp: '', instagram: '', facebook: '', email: '', endereco: '' }, categorias: [], produtos: [] };
  }
}

/** Salva o estado atual como rascunho no localStorage (o site principal já sabe ler esse rascunho) */
function salvarRascunho() {
  localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dados));
}

/* --------------------------------------------------------------------------
   3. INICIALIZAÇÃO DO PAINEL
   -------------------------------------------------------------------------- */
async function inicializarPainel() {
  dados = await carregarDadosAdmin();

  iniciarNavegacaoMenu();
  renderizarTabelaProdutos();
  renderizarCategorias();
  preencherFormularioLoja();
  iniciarFormularioProduto();
  iniciarUploadImagens();
  iniciarBuscaAdmin();
  iniciarSalvamento();
}

function iniciarNavegacaoMenu() {
  document.querySelectorAll('.admin-menu button').forEach(botao => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('.admin-menu button').forEach(b => b.classList.remove('ativo'));
      botao.classList.add('ativo');
      document.querySelectorAll('.secao-admin').forEach(s => s.style.display = 'none');
      document.getElementById('secao-' + botao.dataset.secao).style.display = 'block';
      if (botao.dataset.secao === 'novo') prepararNovoProduto();
    });
  });
}

/* --------------------------------------------------------------------------
   4. TABELA DE PRODUTOS
   -------------------------------------------------------------------------- */
function renderizarTabelaProdutos(filtro = '') {
  const corpo = document.getElementById('corpo-tabela-produtos');
  const termo = filtro.trim().toLowerCase();
  const lista = dados.produtos.filter(p =>
    !termo || p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo));

  if (lista.length === 0) {
    corpo.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--cor-texto-suave);padding:2rem">Nenhum produto cadastrado ainda.</td></tr>`;
    return;
  }

  corpo.innerHTML = lista.map(p => `
    <tr>
      <td><img src="${(p.imagens && p.imagens[0]) || 'fotos/sem-imagem.jpg'}" alt="${p.nome}" onerror="this.src='fotos/sem-imagem.jpg'"></td>
      <td><strong>${p.nome}</strong><br><small style="color:var(--cor-texto-suave)">${p.codigo}</small></td>
      <td>${p.categoria}</td>
      <td>${p.precoPromocional ? `<s style="color:var(--cor-texto-suave)">R$ ${p.preco.toFixed(2)}</s> R$ ${p.precoPromocional.toFixed(2)}` : `R$ ${p.preco.toFixed(2)}`}</td>
      <td><span class="badge-status ${p.status === 'Disponível' ? 'badge-disponivel' : 'badge-esgotado'}">${p.status}</span></td>
      <td class="tabela-acoes">
        <button onclick="editarProduto('${p.codigo}')">Editar</button>
        <button class="excluir" onclick="excluirProduto('${p.codigo}')">Excluir</button>
      </td>
    </tr>`).join('');
}

function iniciarBuscaAdmin() {
  document.getElementById('busca-admin').addEventListener('input', (e) => renderizarTabelaProdutos(e.target.value));
}

function excluirProduto(codigo) {
  if (!confirm('Tem certeza que deseja excluir este produto? Essa ação não pode ser desfeita.')) return;
  dados.produtos = dados.produtos.filter(p => p.codigo !== codigo);
  salvarRascunho();
  renderizarTabelaProdutos(document.getElementById('busca-admin').value);
}

/* --------------------------------------------------------------------------
   5. FORMULÁRIO DE PRODUTO (adicionar / editar)
   -------------------------------------------------------------------------- */
function preencherSelectCategorias() {
  const select = document.getElementById('produto-categoria');
  select.innerHTML = dados.categorias.map(c => `<option value="${c}">${c}</option>`).join('');
}

function prepararNovoProduto() {
  document.getElementById('titulo-form-produto').textContent = 'Adicionar produto';
  document.getElementById('form-produto').reset();
  document.getElementById('produto-codigo-original').value = '';
  document.getElementById('produto-codigo').disabled = false;
  imagensEmEdicao = [];
  etiquetasEmEdicao = [];
  preencherSelectCategorias();
  atualizarPreviewImagens();
  document.querySelectorAll('#etiquetas-opcoes .chip').forEach(c => c.classList.remove('selecionado'));
}

function editarProduto(codigo) {
  const produto = dados.produtos.find(p => p.codigo === codigo);
  if (!produto) return;

  // Ativa a seção/menu "Adicionar produto" (reaproveitado também para edição)
  document.querySelectorAll('.admin-menu button').forEach(b => b.classList.remove('ativo'));
  document.querySelector('[data-secao="novo"]').classList.add('ativo');
  document.querySelectorAll('.secao-admin').forEach(s => s.style.display = 'none');
  document.getElementById('secao-novo').style.display = 'block';

  document.getElementById('titulo-form-produto').textContent = 'Editar produto — ' + produto.nome;
  preencherSelectCategorias();

  document.getElementById('produto-codigo-original').value = produto.codigo;
  document.getElementById('produto-codigo').value = produto.codigo;
  document.getElementById('produto-codigo').disabled = true; // evita duplicidade acidental
  document.getElementById('produto-nome').value = produto.nome;
  document.getElementById('produto-categoria').value = produto.categoria;
  document.getElementById('produto-status').value = produto.status;
  document.getElementById('produto-preco').value = produto.preco;
  document.getElementById('produto-preco-promo').value = produto.precoPromocional || '';
  document.getElementById('produto-tamanhos').value = produto.tamanhos.join(', ');
  document.getElementById('produto-cores').value = produto.cores.join(', ');
  document.getElementById('produto-descricao').value = produto.descricao;
  document.getElementById('produto-destaque').checked = !!produto.destaque;

  imagensEmEdicao = [...(produto.imagens || [])];
  etiquetasEmEdicao = [...(produto.etiquetas || [])];
  atualizarPreviewImagens();
  document.querySelectorAll('#etiquetas-opcoes .chip').forEach(c =>
    c.classList.toggle('selecionado', etiquetasEmEdicao.includes(c.dataset.et)));
}

function iniciarFormularioProduto() {
  // Chips de etiquetas
  document.getElementById('etiquetas-opcoes').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chip.classList.toggle('selecionado');
    const et = chip.dataset.et;
    etiquetasEmEdicao = chip.classList.contains('selecionado')
      ? [...etiquetasEmEdicao, et]
      : etiquetasEmEdicao.filter(x => x !== et);
  });

  document.getElementById('botao-cancelar-form').addEventListener('click', () => {
    document.querySelector('[data-secao="produtos"]').click();
  });

  document.getElementById('form-produto').addEventListener('submit', (e) => {
    e.preventDefault();

    const codigoOriginal = document.getElementById('produto-codigo-original').value;
    const codigoNovo = document.getElementById('produto-codigo').value.trim();

    // Valida código duplicado apenas ao criar (na edição o campo fica travado)
    if (!codigoOriginal && dados.produtos.some(p => p.codigo === codigoNovo)) {
      alert('Já existe um produto com esse código. Escolha outro código.');
      return;
    }
    if (imagensEmEdicao.length === 0) {
      if (!confirm('Nenhuma imagem foi adicionada a este produto. Deseja salvar mesmo assim?')) return;
    }

    const produtoObjeto = {
      codigo: codigoOriginal || codigoNovo,
      nome: document.getElementById('produto-nome').value.trim(),
      categoria: document.getElementById('produto-categoria').value,
      descricao: document.getElementById('produto-descricao').value.trim(),
      preco: parseFloat(document.getElementById('produto-preco').value),
      precoPromocional: document.getElementById('produto-preco-promo').value
        ? parseFloat(document.getElementById('produto-preco-promo').value) : null,
      tamanhos: document.getElementById('produto-tamanhos').value.split(',').map(t => t.trim()).filter(Boolean),
      cores: document.getElementById('produto-cores').value.split(',').map(c => c.trim()).filter(Boolean),
      imagens: imagensEmEdicao,
      status: document.getElementById('produto-status').value,
      etiquetas: etiquetasEmEdicao,
      destaque: document.getElementById('produto-destaque').checked
    };

    if (codigoOriginal) {
      const indice = dados.produtos.findIndex(p => p.codigo === codigoOriginal);
      dados.produtos[indice] = produtoObjeto;
    } else {
      dados.produtos.push(produtoObjeto);
    }

    salvarRascunho();
    renderizarTabelaProdutos();
    alert('Produto salvo! Não esqueça de ir em "Salvar / Exportar" para publicar no site.');
    document.querySelector('[data-secao="produtos"]').click();
  });
}

/* --------------------------------------------------------------------------
   6. UPLOAD DE IMAGENS (convertidas para base64, gravadas dentro do JSON —
   funciona sem servidor e sem precisar mexer na pasta "fotos")
   -------------------------------------------------------------------------- */
function iniciarUploadImagens() {
  const area = document.getElementById('area-upload');
  const input = document.getElementById('input-upload');

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = 'var(--cor-latao)'; });
  area.addEventListener('dragleave', () => area.style.borderColor = '');
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    processarArquivosImagem(e.dataTransfer.files);
  });
  input.addEventListener('change', () => processarArquivosImagem(input.files));
}

function processarArquivosImagem(arquivos) {
  [...arquivos].forEach(arquivo => {
    if (!arquivo.type.startsWith('image/')) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      imagensEmEdicao.push(leitor.result); // string base64 (data URL)
      atualizarPreviewImagens();
    };
    leitor.readAsDataURL(arquivo);
  });
}

function atualizarPreviewImagens() {
  const container = document.getElementById('pre-visualizacao');
  container.innerHTML = imagensEmEdicao.map((img, i) => `
    <div class="item-imagem">
      <img src="${img}" alt="Prévia ${i + 1}">
      <button type="button" class="remover-imagem" onclick="removerImagemEdicao(${i})" title="Remover">✕</button>
    </div>`).join('');
}

function removerImagemEdicao(indice) {
  imagensEmEdicao.splice(indice, 1);
  atualizarPreviewImagens();
}

/* --------------------------------------------------------------------------
   7. CATEGORIAS
   -------------------------------------------------------------------------- */
function renderizarCategorias() {
  const lista = document.getElementById('lista-categorias');
  lista.innerHTML = dados.categorias.map(c => `
    <span class="chip" style="display:inline-flex;align-items:center;gap:0.4rem">
      ${c} <button type="button" onclick="removerCategoria('${c}')" style="color:var(--cor-vinho);font-weight:700">✕</button>
    </span>`).join('') || '<p style="color:var(--cor-texto-suave);font-size:0.85rem">Nenhuma categoria cadastrada ainda.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
  const botaoAdd = document.getElementById('botao-add-categoria');
  if (botaoAdd) {
    botaoAdd.addEventListener('click', () => {
      const campo = document.getElementById('nova-categoria');
      const nome = campo.value.trim();
      if (!nome) return;
      if (dados.categorias.includes(nome)) { alert('Essa categoria já existe.'); return; }
      dados.categorias.push(nome);
      campo.value = '';
      salvarRascunho();
      renderizarCategorias();
    });
  }
});

function removerCategoria(nome) {
  const emUso = dados.produtos.some(p => p.categoria === nome);
  if (emUso && !confirm(`Existem produtos usando a categoria "${nome}". Remover mesmo assim?`)) return;
  dados.categorias = dados.categorias.filter(c => c !== nome);
  salvarRascunho();
  renderizarCategorias();
}

/* --------------------------------------------------------------------------
   8. DADOS DA LOJA
   -------------------------------------------------------------------------- */
function preencherFormularioLoja() {
  const l = dados.loja || {};
  document.getElementById('loja-nome').value = l.nome || '';
  document.getElementById('loja-slogan').value = l.slogan || '';
  document.getElementById('loja-whatsapp').value = l.whatsapp || '';
  document.getElementById('loja-email').value = l.email || '';
  document.getElementById('loja-endereco').value = l.endereco || '';
  document.getElementById('loja-instagram').value = l.instagram || '';
  document.getElementById('loja-facebook').value = l.facebook || '';

  document.getElementById('botao-salvar-loja').addEventListener('click', salvarDadosLoja);
}

function salvarDadosLoja() {
  dados.loja = {
    ...dados.loja,
    nome: document.getElementById('loja-nome').value.trim(),
    slogan: document.getElementById('loja-slogan').value.trim(),
    whatsapp: document.getElementById('loja-whatsapp').value.replace(/\D/g, ''),
    email: document.getElementById('loja-email').value.trim(),
    endereco: document.getElementById('loja-endereco').value.trim(),
    instagram: document.getElementById('loja-instagram').value.trim(),
    facebook: document.getElementById('loja-facebook').value.trim()
  };

  const logoInput = document.getElementById('loja-logo-upload');
  const bannerInput = document.getElementById('loja-banner-upload');
  const promessas = [];

  if (logoInput.files[0]) {
    promessas.push(new Promise(resolve => {
      const leitor = new FileReader();
      leitor.onload = () => { dados.loja.logo = leitor.result; resolve(); };
      leitor.readAsDataURL(logoInput.files[0]);
    }));
  }
  if (bannerInput.files[0]) {
    promessas.push(new Promise(resolve => {
      const leitor = new FileReader();
      leitor.onload = () => { dados.loja.banner = leitor.result; resolve(); };
      leitor.readAsDataURL(bannerInput.files[0]);
    }));
  }

  Promise.all(promessas).then(() => {
    salvarRascunho();
    alert('Dados da loja salvos! Vá em "Salvar / Exportar" para publicar no site.');
  });
}

/* --------------------------------------------------------------------------
   9. SALVAR / EXPORTAR PRODUTOS.JSON
   -------------------------------------------------------------------------- */
function iniciarSalvamento() {
  document.getElementById('botao-baixar-json').addEventListener('click', baixarJson);
  const botaoDireto = document.getElementById('botao-salvar-direto');
  const status = document.getElementById('status-salvar-direto');

  if (!('showOpenFilePicker' in window)) {
    botaoDireto.disabled = true;
    botaoDireto.title = 'Recurso não suportado neste navegador';
    status.textContent = 'Não suportado neste navegador — use a Opção 2 abaixo.';
    return;
  }

  botaoDireto.addEventListener('click', async () => {
    try {
      if (!handleArquivoJson) {
        [handleArquivoJson] = await window.showOpenFilePicker({
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        const permissao = await handleArquivoJson.requestPermission({ mode: 'readwrite' });
        if (permissao !== 'granted') { status.textContent = 'Permissão negada.'; handleArquivoJson = null; return; }
      }
      const writable = await handleArquivoJson.createWritable();
      await writable.write(JSON.stringify(dados, null, 2));
      await writable.close();
      status.textContent = 'Salvo com sucesso em ' + new Date().toLocaleTimeString('pt-BR') + '!';
    } catch (erro) {
      if (erro.name !== 'AbortError') status.textContent = 'Não foi possível salvar: ' + erro.message;
    }
  });
}

function baixarJson() {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'produtos.json';
  link.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------------------
   10. INICIALIZAÇÃO GERAL / EVENTOS DE LOGIN
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('botao-entrar').addEventListener('click', tentarLogin);
  document.getElementById('campo-senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') tentarLogin(); });
  document.getElementById('botao-sair').addEventListener('click', () => {
    sessionStorage.removeItem(CHAVE_SESSAO);
    window.location.reload();
  });

  // Mantém logado enquanto a aba estiver aberta (sessionStorage some ao fechar a aba)
  if (sessionStorage.getItem(CHAVE_SESSAO) === 'sim') abrirPainel();
});
