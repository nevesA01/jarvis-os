# Jarvis OS para Windows

O desktop é empacotado com Electron como um instalador NSIS. A janela abre a aplicação hospedada em `https://jarvis.kryontech.com.br`, enquanto o agente local roda no próprio Windows dentro do aplicativo.

## Preparar repositórios e atualizações

Para manter o código-fonte privado e permitir que o atualizador funcione sem credenciais no computador dos usuários, use dois repositórios:

1. Mantenha este repositório do código privado.
2. Crie `nevesA01/jarvis-os-updates` como **público**. O electron-updater baixa `latest.yml` e os instaladores sem autenticação; um repositório privado de releases exigiria distribuir credenciais aos usuários, o que não é seguro.
3. No repositório privado do código, adicione o secret de Actions `UPDATES_REPO_TOKEN`. Use um fine-grained personal access token limitado a `nevesA01/jarvis-os-updates`, com acesso **Contents: Read and write**. Não coloque o token no código, no instalador ou em variáveis expostas ao navegador.
4. Confirme que o workflow `Windows installer` está habilitado. Ao enviar uma tag `vX.Y.Z` igual à versão de `package.json`, o workflow compila/testa o instalador, guarda um artefato de 30 dias no repositório privado e publica os arquivos de atualização como release no repositório público.
5. Publique o primeiro instalador pelo workflow com a versão `1.0.2` e a tag `v1.0.2`. Não reutilize uma tag ou versão já publicada. Instalações antigas que apontam para `nevesA01/jarvis-os` precisam reinstalar a versão `1.0.2` uma vez; as próximas versões serão atualizadas pelo app.

O repositório de updates precisa permanecer público para o mecanismo atual. Se tornar privado também esse repositório, atualizações automáticas sem login deixarão de funcionar.

## Criar o instalador manualmente

Em um ambiente Windows com as dependências do projeto instaladas, execute `npm run desktop:win`. O arquivo `release/Jarvis-OS-Setup-1.0.2.exe`, o manifesto `release/latest.yml` e o `.blockmap` serão gerados. Para usuários finais, prefira baixar o instalador da release pública `jarvis-os-updates`.

## Usar

1. Execute o instalador e abra Jarvis OS pelo Menu Iniciar ou pelo atalho da área de trabalho.
2. Confirme que o aplicativo conseguiu acessar o servidor online.
3. Abra **Canal Neural → Acesso ao computador**.
4. Clique em **Parear agente** usando o código de uso único exibido no painel.
5. Configure um provedor de IA e sua chave na aba **IAs** para ativar respostas da IA.

Não precisa instalar Node.js nem iniciar um terminal ou agente em separado. O agente local é encerrado ao fechar o aplicativo. As ações no computador continuam exigindo aprovação explícita. O Jarvis verifica atualizações estáveis ao iniciar e pede autorização antes de baixar; após o download, você pode reiniciar para instalar ou adiar.

## Requisitos e limites

- Windows 10/11 x64 e conexão à internet.
- O servidor hospedado precisa estar acessível em `jarvis.kryontech.com.br`.
- O servidor online e a IA continuam sendo serviços remotos; esta versão desktop não é um pacote completamente offline.
- Se a porta local `3211` estiver em uso, feche o aplicativo que a ocupa e reinicie o Jarvis.
