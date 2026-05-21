# Passo a Passo: Configuração e Execução da Aplicação NovoSGA via Docker

Este guia contém o passo a passo completo para configurar e executar a aplicação NovoSGA usando Docker Compose, baseado nos comandos e correções realizados durante a configuração.

## Instalação Oficial via https://novosga.org/

Antes de usar o Docker, você pode instalar o NovoSGA de forma tradicional:

- **Acesse o site oficial**: [https://novosga.org/](https://novosga.org/)
- **Instalação via Composer** (recomendado para desenvolvimento):
  - Execute: `composer create-project novosga/novosga`
- **Documentação completa**: [https://novosga.org/docs/](https://novosga.org/docs/)
- **Download direto**: [https://github.com/novosga/novosga/releases](https://github.com/novosga/novosga/releases)
- **Hospedagem profissional**: [https://novosga.com/](https://novosga.com/)

Este guia foca na execução via Docker para um setup rápido e isolado.

## Pré-requisitos
- Docker Desktop instalado e em execução no Windows.
- Acesso ao terminal (PowerShell ou Command Prompt) no diretório do projeto (C:\wamp64\www\novosga-docker).

## Passo 1: Verificar e corrigir arquivos de configuração do Docker Compose
- **Arquivo**: `compose.override.yaml`
- **Problema inicial**: Campo `version` obsoleto e serviço `database` inválido (sem imagem ou build).
- **Correção**: Remover a linha `version: '3'` e o bloco do serviço `database`.
- **Comando executado**: Edição manual no arquivo (removido via ferramenta de edição).

## Passo 2: Iniciar os serviços Docker
- **Comando**: `docker-compose up -d`
- Se Docker não estiver rodando, inicie o Docker Desktop primeiro.
- **Erro inicial**: "service 'database' has neither an image nor a build context specified" – corrigido no Passo 1.
- Após correção, os serviços devem iniciar: novosga, mercure, mysqldb e mailer.

## Passo 3: Configurar permissões do banco de dados MySQL
- Conectar ao MySQL dentro do container:
  - **Comando**: `docker-compose exec mysqldb sh -c 'mysql -uroot -p'`
  - **Senha**: 150769 (definida em `MYSQL_ROOT_PASSWORD`).
- Criar usuário e conceder privilégios:
  - **SQL**: `CREATE USER IF NOT EXISTS 'novosga'@'localhost' IDENTIFIED BY '150769';`
  - **SQL**: `GRANT ALL PRIVILEGES ON novosga2.* TO 'novosga'@'localhost';`
  - **SQL**: `FLUSH PRIVILEGES;`
- **Nota**: Em MySQL 8, o comando `GRANT` com `IDENTIFIED BY` foi removido. Use `CREATE USER` separadamente.

## Passo 4: Expor porta do MySQL para acesso externo (opcional, para desenvolvimento)
- **Arquivo**: `compose.yaml`
- Adicionar ao serviço `mysqldb`:
  ```yaml
  ports:
    - "3306:3306"
  ```
- **Comando**: Edição no arquivo `compose.yaml`.

## Passo 5: Corrigir URLs de conexão interna nos containers
- **Arquivo**: `compose.yaml`
- **Problema**: `DATABASE_URL` e `MERCURE_URL` usando `127.0.0.1` (localhost do host), mas dentro do Docker, deve usar nomes de serviços.
- **Correções**:
  - `DATABASE_URL`: Alterar de `'mysql://novosga:150769@127.0.0.1:3306/novosga2?charset=utf8mb4&serverVersion=5.7'` para `'mysql://novosga:150769@mysqldb:3306/novosga2?charset=utf8mb4&serverVersion=8.0'`
  - `MERCURE_URL`: Alterar de `'http://127.0.0.1/.well-known/mercure'` para `'http://mercure/.well-known/mercure'`
- **Comando**: Edições no arquivo `compose.yaml`.

## Passo 6: Reiniciar os serviços após correções
- Parar serviços: `docker-compose down`
- Iniciar novamente: `docker-compose up -d`
- Verificar logs se necessário: `docker-compose logs novosga`

## Passo 7: Verificar funcionamento
- A aplicação deve estar acessível em: `http://localhost:80` (ou `http://<IP_DO_HOST>:80` de outro dispositivo).
- Mercure: `http://localhost:3000` (ou `http://<IP_DO_HOST>:3000`).
- Se houver "Waiting for database...", verifique as conexões e reinicie.

## Passo 8: Acesso de outros dispositivos (opcional)
- Descubra o IP da máquina: Execute `ipconfig` no terminal e use o "Endereço IPv4".
- Acesse via navegador: `http://<IP>:80` para a aplicação.
- Certifique-se de que o firewall permite as portas 80, 3000 e 3306.

## Notas finais
- Sempre verifique os logs com `docker-compose logs` se houver erros.
- Para parar tudo: `docker-compose down`
- Para limpar volumes (se necessário): `docker-compose down -v`
- Este setup é para desenvolvimento local. Para produção, ajuste variáveis de ambiente e segurança.</content>
<parameter name="filePath">c:\wamp64\www\novosga-docker\passo_a_passo_docker.md