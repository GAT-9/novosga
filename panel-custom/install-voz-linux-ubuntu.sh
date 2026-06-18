#!/bin/bash

set -e

echo "Instalando RHVoice..."

if ! command -v snap >/dev/null 2>&1; then
  echo "Snap não encontrado."
  echo "Instalando snapd..."
  sudo apt update
  sudo apt install -y snapd
fi

sudo snap install rhvoice

echo "Instalando voz Letícia..."
sudo rhvoice.vm -i Letícia-F123

echo "Testando voz..."
echo "Olá, estou aqui!" | rhvoice.test

echo ""
echo "Instalação concluída."
echo "Feche e abra o navegador novamente."
echo "Se a voz não aparecer, reinicie o computador."
