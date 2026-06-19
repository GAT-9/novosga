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
function abreviarNome(nome, limite = 20) {
  if (!nome) return "";

  nome = nome.trim();

  if (nome.length <= limite) {
    return nome;
  }

  const partes = nome.split(" ").filter(Boolean);

  if (partes.length <= 2) {
    return nome.slice(0, limite - 3) + "...";
  }

  let resultado = nome;

  for (let i = partes.length - 1; i >= 1; i--) {
    partes[i] = `${partes[i][0]}.`;
    resultado = partes.join(" ");

    if (resultado.length <= limite) {
      return resultado;
    }
  }

  return resultado.length <= limite
    ? resultado
    : resultado.slice(0, limite - 3) + "...";
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

    montarHistorico(dados, atual);

    if (atual.id !== state.ultimoId) {
      state.ultimoId = atual.id;
      tocarAlerta(config.alert);

      setTimeout(() => {
        falar(nome, local);
      }, 1500);
    }
  } catch (e) {
    console.error(e);
    mostrarErro("Erro de conexão", e.message);
  }
}

function montarHistorico(dados, atual) {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  if (!Array.isArray(dados) || !atual) return;

  function gerarChave(item) {
    if (!item) return "";

    const nome = item.nomeCliente || "";
    const sigla = item.siglaSenha || "";
    const numero = item.numeroSenha || "";
    const local = item.local || "";
    const numeroLocal = item.numeroLocal || "";

    return `${nome}-${sigla}-${numero}-${local}-${numeroLocal}`;
  }

  const chaveAtual = gerarChave(atual);
  const chamadasJaMostradas = new Set();
  
  const historico = dados
  .filter(item => {
    if (!item) return false;
    
      const chaveItem = gerarChave(item);

      if (chaveItem === chaveAtual) {
        return false;
      }

      if (chamadasJaMostradas.has(chaveItem)) {
        return false;
      }
      
      chamadasJaMostradas.add(chaveItem);
      return true;
    })
    
    .slice(0, 3);
    historico.forEach(item => {
      const nome = item.nomeCliente ||
      `${item.siglaSenha || ""}${String(item.numeroSenha || "").padStart(3, "0")}`;

    const local = `${item.local || ""} ${item.numeroLocal || ""}`;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<strong>${abreviarNome(nome)}</strong><span>${local}</span>`;
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

  const nomecompleto = new SpeechSynthesisUtterance(`${nome}`);

  nomecompleto.lang = "pt-BR";
  nomecompleto.rate = 0.7 ;
  nomecompleto.pitch = 1;
  nomecompleto.volume = 1;

  speechSynthesis.speak(nomecompleto);
  
  const localizacao = new SpeechSynthesisUtterance(`${local}`);

  localizacao.lang = "pt-BR";
  localizacao.rate = 0.5;
  localizacao.pitch = 1;
  localizacao.volume = 1;
  
  speechSynthesis.speak(localizacao);

}

function mostrarErro(titulo, subtitulo) {
  document.getElementById("nome").textContent = titulo;
  document.getElementById("local").textContent = subtitulo;
}

setInterval(atualizarHora, 1000);
setInterval(carregarChamadas, 3000);

atualizarHora();
carregarChamadas();