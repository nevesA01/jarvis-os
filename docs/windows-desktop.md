# Jarvis OS para Windows

O desktop é empacotado como um aplicativo Electron. A janela abre a aplicação hospedada em `https://jarvis.kryontech.com.br`, enquanto o agente local roda no próprio Windows dentro do aplicativo.

## Hospedagem no Dokploy

O próprio servidor do Jarvis entrega o instalador. O endpoint estável é:

`https://jarvis.kryontech.com.br/downloads/Jarvis-OS-Setup-latest.exe`

No Dokploy, faça o seguinte:

1. Abra o serviço do Jarvis e adicione um volume persistente montado em `/app/downloads`.
2. Gere o instalador Windows pelo processo de build desktop do projeto.
3. Renomeie o arquivo gerado para `Jarvis-OS-Setup-latest.exe`.
4. Envie esse arquivo para a pasta do volume que o Dokploy monta em `/app/downloads`.
5. Nas variáveis de ambiente do serviço, configure `JARVIS_DESKTOP_VERSION` com a versão do instalador, por exemplo `1.0.3`.
6. Configure `JARVIS_DESKTOP_INSTALLER_URL` como `https://jarvis.kryontech.com.br/downloads/Jarvis-OS-Setup-latest.exe`, ou deixe o valor padrão.
7. Faça o redeploy do serviço.

Teste no navegador:

- `https://jarvis.kryontech.com.br/api/desktop-update` deve responder JSON com `version` e `installerUrl`.
- `https://jarvis.kryontech.com.br/downloads/Jarvis-OS-Setup-latest.exe` deve iniciar o download do instalador.

Para publicar uma atualização, gere o novo `.exe`, substitua o arquivo no volume persistente, altere `JARVIS_DESKTOP_VERSION` e faça o redeploy. O código-fonte e o repositório GitHub podem continuar privados. Não remova o volume persistente, pois o arquivo seria perdido durante a recriação do container.

## Criar o instalador

Execute `npm run desktop:win`. O arquivo `release/Jarvis-OS-Setup-1.0.2.exe` será gerado. O workflow do Windows continua disponível para gerar e testar o artefato, mas a publicação do instalador é feita no volume do Dokploy.

## Usar

1. Execute o instalador e abra Jarvis OS pelo Menu Iniciar ou pelo atalho da área de trabalho.
2. Confirme que o aplicativo conseguiu acessar o servidor online.
3. Abra **Canal Neural → Acesso ao computador**.
4. Clique em **Parear agente** usando o código de uso único exibido no painel.
5. Configure um provedor de IA e sua chave na aba **IAs** para ativar respostas da IA.

Não precisa instalar Node.js nem iniciar um terminal ou agente em separado. O agente local é encerrado ao fechar o aplicativo. As ações no computador continuam exigindo aprovação explícita. O Jarvis verifica atualizações ao iniciar e pede autorização antes de abrir o download; a instalação continua sendo confirmada pelo usuário no Windows.

## Requisitos e limites

- Windows 10/11 x64 e conexão à internet.
- O servidor hospedado precisa estar acessível em `jarvis.kryontech.com.br`.
- O servidor online e a IA continuam sendo serviços remotos; esta versão desktop não é um pacote completamente offline.
- Se a porta local `3211` estiver em uso, feche o aplicativo que a ocupa e reinicie o Jarvis.
