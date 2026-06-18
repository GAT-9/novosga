#!/bin/bash

set -e

echo "Verificando Snap..."

if ! command -v snap >/dev/null 2>&1; then
  echo "Instalando snapd..."
  sudo apt update
  sudo apt install -y snapd
fi

echo "Instalando RHVoice..."
sudo snap install rhvoice || true

RHVOICE_VM="/snap/bin/rhvoice.vm"
RHVOICE_TEST="/snap/bin/rhvoice.test"

if [ ! -f "$RHVOICE_VM" ]; then
  echo "Erro: rhvoice.vm não foi encontrado em /snap/bin."
  echo "Tente reiniciar o computador e executar novamente."
  exit 1
fi

echo "Instalando voz Letícia..."
sudo "$RHVOICE_VM" -i Letícia-F123

echo "Testando voz..."
echo "Olá, estou aqui!" | "$RHVOICE_TEST"

echo ""
echo "Instalação concluída."
echo "Feche e abra o navegador novamente."
