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
