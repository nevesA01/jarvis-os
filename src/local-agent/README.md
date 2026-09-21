# Agente local do Jarvis para Windows

Este agente é um protótipo local. Ele escuta somente em `127.0.0.1:3210` e exige um código de pareamento antes de aceitar ações.

## Como iniciar no Windows

1. Instale o Node.js LTS.
2. Abra o PowerShell nesta pasta do projeto.
3. Execute:

```powershell
node .\src\local-agent\agent.mjs
```

4. Mantenha a janela aberta.
5. Copie o código de pareamento exibido no terminal.
6. Abra a console do Jarvis, em **Acesso ao computador**.
7. Cole o código e clique em **Parear agente**.

## Primeiro teste

Depois que o painel mostrar **Conectado**, peça ao Jarvis para listar uma pasta. A interface ainda precisa enviar pedidos autorizados para o agente para executar uma ação; o endpoint local já está preparado para isso.

## Segurança

- Não abra a porta 3210 no firewall.
- Não troque `127.0.0.1` por `0.0.0.0`.
- Não execute o agente como administrador.
- O token fica somente no armazenamento local do navegador.
- O código de pareamento muda ao desconectar o agente.
- Ações perigosas devem continuar exigindo confirmação explícita no Jarvis.

Este protótipo não instala serviços, não inicia com o Windows e não concede privilégios administrativos automaticamente.
