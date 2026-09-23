# Jarvis OS

Frontend do assistente Jarvis com visual de núcleo animado, chat do agente e captura de comandos por voz (Web Speech API, wake word “Jarvis”).

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

O resultado é gerado na pasta `dist/`.

## Aplicativo para Windows

O projeto também pode ser empacotado como aplicativo desktop com instalador `.exe`. A versão desktop abre a interface hospedada do Jarvis e inclui o agente local do Windows, sem exigir Node.js ou instalação separada do agente no computador de destino. O Jarvis hospedado continua sendo necessário para conversar com os serviços online; recursos que chamam uma IA exigem que você configure um provedor e sua chave na aba **IAs**.

O instalador é gerado durante uma compilação Windows e fica em `release/Jarvis-OS-Setup-1.0.0.exe`. Para empacotar, use `npm run desktop:win` em um ambiente de desenvolvimento Windows depois de instalar as dependências do projeto. A configuração de instalador e os arquivos-fonte do desktop estão em `electron/`.

Depois de instalar, abra **Jarvis OS**, entre em **Canal Neural → Acesso ao computador** e clique em **Parear agente** usando o código mostrado no próprio aplicativo. Não é necessário abrir um terminal nem instalar Node.js.

## Deploy com Docker (Dokploy)

O `Dockerfile` deste repositório faz um build multiestágio:

1. `node:22-alpine` instala as dependências e executa `npm run build`.
2. `nginx:alpine` serve a pasta `dist/` na porta **3000**.
3. O `nginx.conf` inclui fallback para `index.html`, necessário para o React Router.

### Pontos de atenção no Dokploy

- Configure a porta do serviço/domínio no Dokploy para **3000** (porta interna do Nginx).
- Configure o domínio `jarvis.kryontech.com.br` apontando para o container.
- Microfone (wake word “Jarvis”) exige **HTTPS** com certificado válido.
- Se aparecer `Bad Gateway`, o container do Nginx provavelmente não está rodando — verifique os logs do container no Dokploy.
