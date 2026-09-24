# Jarvis OS para Windows

O desktop é empacotado como um aplicativo Electron. A janela abre a aplicação hospedada em `https://jarvis.kryontech.com.br`, enquanto o agente local roda no próprio Windows dentro do aplicativo.

## Atualizações sem GitHub

O aplicativo consulta `https://jarvis.kryontech.com.br/api/desktop-update` ao iniciar. Quando o servidor informa uma versão maior que a instalada, o Jarvis mostra uma confirmação e abre o instalador oficial no domínio do Jarvis. O código-fonte pode permanecer privado e não é necessário criar repositório público, token ou release no GitHub.

Configure no servidor hospedado:

- `JARVIS_DESKTOP_VERSION`: versão mais recente publicada, por exemplo `1.0.3`.
- `JARVIS_DESKTOP_INSTALLER_URL`: URL HTTPS do instalador hospedado no próprio domínio, por exemplo `https://jarvis.kryontech.com.br/downloads/Jarvis-OS-Setup-latest.exe`.

A URL do instalador deve permanecer no mesmo domínio configurado no Electron. Isso impede que uma resposta comprometida redirecione o usuário para um executável de outro site.

## Criar o instalador

Execute `npm run desktop:win`. O arquivo `release/Jarvis-OS-Setup-1.0.2.exe` será gerado. Hospede uma cópia com nome estável no caminho configurado em `JARVIS_DESKTOP_INSTALLER_URL`. Para publicar uma atualização, gere um novo instalador, substitua o arquivo hospedado e altere `JARVIS_DESKTOP_VERSION` no servidor.

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
