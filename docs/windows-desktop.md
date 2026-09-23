# Jarvis OS para Windows

O desktop é empacotado com Electron como um instalador NSIS. A janela abre a aplicação hospedada em `https://jarvis.kryontech.com.br`, enquanto o agente local roda no próprio Windows dentro do aplicativo.

## Criar o instalador

Em um ambiente Windows com as dependências do projeto instaladas, execute `npm run desktop:win`. O arquivo `release/Jarvis-OS-Setup-1.0.0.exe` será gerado para distribuição.

## Usar

1. Execute o instalador e abra Jarvis OS pelo Menu Iniciar ou pelo atalho da área de trabalho.
2. Confirme que o aplicativo conseguiu acessar o servidor online.
3. Abra **Canal Neural → Acesso ao computador**.
4. Clique em **Parear agente** usando o código de uso único exibido no painel.
5. Configure um provedor de IA e sua chave na aba **IAs** para ativar respostas da IA.

Não precisa instalar Node.js nem iniciar um terminal ou agente em separado. O agente local é encerrado ao fechar o aplicativo. As ações no computador continuam exigindo aprovação explícita.

## Requisitos e limites

- Windows 10/11 x64 e conexão à internet.
- O servidor hospedado precisa estar acessível em `jarvis.kryontech.com.br`.
- O servidor online e a IA continuam sendo serviços remotos; esta versão desktop não é um pacote completamente offline.
- Se a porta local `3211` estiver em uso, feche o aplicativo que a ocupa e reinicie o Jarvis.
