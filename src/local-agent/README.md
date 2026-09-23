# Agente local do Jarvis para Windows

Este agente é um protótipo local. Ele escuta somente em `127.0.0.1:3210` e exige um código de pareamento antes de aceitar ações. Depois do pareamento, o Jarvis pode solicitar controle amplo do Windows — aplicativos, URLs, arquivos, downloads, informações do sistema e comandos — mas cada solicitação continua bloqueada até sua aprovação explícita.

## Como iniciar no Windows

1. Instale o Node.js LTS.
2. Abra o PowerShell na pasta raiz do projeto, onde ficam `package.json` e `src`.
3. Execute:

```powershell
node .\src\local-agent\agent.mjs
```

Se o PowerShell estiver em `C:\Windows\System32`, abra a pasta raiz do projeto no Explorador de Arquivos e escolha **Abrir no Terminal**. Não execute o comando a partir de `C:\Windows\System32`.

4. Mantenha a janela aberta. Se o prompt `PS ...>` reaparecer logo depois das mensagens, o agente encerrou; execute o comando novamente e não pressione `Ctrl + C`.
5. Para iniciar automaticamente com o Windows, crie um atalho deste comando na pasta `shell:startup` do Windows. O navegador ainda precisa ser aberto pelo usuário; por segurança, nenhum site pode ligar microfone ou iniciar processos do PC silenciosamente.
6. Copie o código de pareamento exibido no terminal.
6. Abra a console do Jarvis, em **Acesso ao computador**.
7. Cole o código e clique em **Parear agente**. O código é de uso único e expira em 5 minutos.

## Primeiro teste

Depois que o painel mostrar **Conectado**, peça ao Jarvis por voz ou texto: “Jarvis, abra o WhatsApp”, “liste os arquivos da pasta Downloads”, “mostre as informações do computador” ou “execute o comando ...”. A ação será mostrada na fila, e você poderá dizer “Jarvis, autorizar”. O agente resolve o WhatsApp da Microsoft Store via `shell:AppsFolder`; para outras instalações, use o nome do executável conhecido. A ação `open_url` abre um endereço HTTPS no navegador padrão do Windows.

## Segurança

- Não abra a porta 3210 no firewall.
- Não troque `127.0.0.1` por `0.0.0.0`.
- Não execute o agente como administrador.
- O token fica somente no armazenamento local do navegador.
- O código de pareamento muda ao desconectar o agente.
- Ações perigosas devem continuar exigindo confirmação explícita no Jarvis.
- O agente não lê senhas, cookies, conteúdo de abas ou códigos de autenticação do navegador.
- O controle de navegador nesta fase é abrir URLs no navegador padrão; automação de cliques, teclado, tela e formulários ainda não está habilitada.
- “Acesso total” não significa acesso oculto ou sem confirmação: o usuário precisa aprovar cada ação, e o agente não deve ser executado como administrador.

Este protótipo não instala serviços, não inicia com o Windows e não concede privilégios administrativos automaticamente.
