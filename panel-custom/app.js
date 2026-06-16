const state = {
  ultimoId: null,
  accessToken: null,
  refreshToken: null,
  expireAt: null,
};

function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`painel-web.v2.${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  localStorage.setItem(`painel-web.v2.${key}`, JSON.stringify(value));
}

async function getConfig() {
  const local = storageGet("config");

  if (local && local.clientId && local.clientSecret) {
    return local;
  }

  const resp = await fetch("config.json");

  if (!resp.ok) {
    return null;
  }

  return await resp.json();
}

function isTokenValid() {
  const expireDate = storageGet("expire_date");

  if (!state.accessToken && storageGet("access_token")) {
    state.accessToken = storageGet("access_token");
  }

  if (!state.refreshToken && storageGet("refresh_token")) {
    state.refreshToken = storageGet("refresh_token");
  }

  if (!state.accessToken || !expireDate) return false;

  return new Date(expireDate).getTime() > Date.now() + 60000;
}

async function loginComSenha(config) {
  const form = new URLSearchParams();

  form.append("grant_type", "password");
  form.append("client_id", config.clientId);
  form.append("client_secret", config.clientSecret);
  form.append("username", config.username);
  form.append("password", config.password);

  const resp = await fetch(`${config.server}/api/token`, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    throw new Error(`Erro ao autenticar: ${resp.status}`);
  }

  return await resp.json();
}

async function renovarToken(config) {
  const refreshToken = state.refreshToken || storageGet("refresh_token");

  if (!refreshToken) {
    return loginComSenha(config);
  }

  const form = new URLSearchParams();

  form.append("grant_type", "refresh_token");
  form.append("client_id", config.clientId);
  form.append("client_secret", config.clientSecret);
  form.append("refresh_token", refreshToken);

  const resp = await fetch(`${config.server}/api/token`, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    return loginComSenha(config);
  }

  return await resp.json();
}

async function garantirToken() {
  const config = await getConfig();

  if (!config) {
    mostrarErro("Painel não configurado", "Configure server, unidade e credenciais.");
    return null;
  }

  if (isTokenValid()) {
    return state.accessToken;
  }

  const tokenData = await renovarToken(config);

  state.accessToken = tokenData.access_token;
  state.refreshToken = tokenData.refresh_token;

  const expireDate = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  storageSet("access_token", state.accessToken);
  storageSet("refresh_token", state.refreshToken);
  storageSet("expire_date", expireDate);

  return state.accessToken;
}

function atualizarHora() {
  document.getElementById("hora").textContent =
    new Date().toLocaleTimeString("pt-BR");
}

async function carregarChamadas() {
  const config = await getConfig();

  if (!config) {
    mostrarErro("Painel não configurado", "Abra as configurações primeiro.");
    return;
  }

  try {
    const token = await garantirToken();
    if (!token) return;

    const servicos = Array.isArray(config.services)
      ? config.services.map(Number).filter(n => n > 0).join(",")
      : "";

    const url = `${config.server}/api/unidades/${config.unity}/painel?servicos=${servicos}`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (resp.status === 401 || resp.status === 403) {
      storageSet("access_token", null);
      state.accessToken = null;
      return;
    }

    if (!resp.ok) {
      console.error("Erro API:", resp.status, await resp.text());
      return;
    }

    const dados = await resp.json();

    if (!Array.isArray(dados) || dados.length === 0) return;

    const atual = dados[0];

    const nome = atual.nomeCliente ||
      `${atual.siglaSenha}${String(atual.numeroSenha).padStart(3, "0")}`;

    const local = `${atual.local} ${atual.numeroLocal}`;

    document.getElementById("nome").textContent = nome;
    document.getElementById("local").textContent = local;

    montarHistorico(dados);

    if (atual.id !== state.ultimoId) {
      state.ultimoId = atual.id;
      tocarAlerta(config.alert);
      falar(nome, local);
    }
  } catch (e) {
    console.error(e);
    mostrarErro("Erro de conexão", e.message);
  }
}

function montarHistorico(dados) {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  dados.slice(0, 4).forEach(item => {
    const nome = item.nomeCliente ||
      `${item.siglaSenha}${String(item.numeroSenha).padStart(3, "0")}`;

    const local = `${item.local} ${item.numeroLocal}`;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `${nome}<span>${local}</span>`;
    lista.appendChild(div);
  });
}

function tocarAlerta(alerta) {
  if (!alerta) return;

  const audio = new Audio(`static/sound/alert/${alerta}`);
  audio.play().catch(() => {});
}

function falar(nome, local) {
  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const fala = new SpeechSynthesisUtterance(`${nome}, ${local}`);

  fala.lang = "pt-BR";
  fala.rate = 0.9;
  fala.pitch = 1;
  fala.volume = 1;

  speechSynthesis.speak(fala);
}

function mostrarErro(titulo, subtitulo) {
  document.getElementById("nome").textContent = titulo;
  document.getElementById("local").textContent = subtitulo;
}

setInterval(atualizarHora, 1000);
setInterval(carregarChamadas, 3000);

atualizarHora();
carregarChamadas();