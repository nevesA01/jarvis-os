# Endpoint WSS do Jarvis Local Agent

O primeiro endpoint da VPS é:

```text
wss://jarvis.kryontech.com.br/ws/local-agent
```

## Variável obrigatória

Configure no ambiente de produção do serviço Nitro/Dokploy:

```text
JARVIS_WSS_ACCESS_TOKEN=um-token-longo-e-aleatorio
```

O agente local deve enviar o mesmo valor no handshake WebSocket:

```http
Authorization: Bearer um-token-longo-e-aleatorio
X-Jarvis-Device: <device_id>
```

O endpoint recusa a conexão quando o token não existe no servidor ou não corresponde ao token enviado. O token nunca deve ser colocado no frontend público, commitado no Git ou exibido nos logs.

## Mensagens iniciais

Depois do handshake, o servidor envia:

```json
{"type":"agent_connected","endpoint":"/ws/local-agent","heartbeat_interval_ms":20000}
```

O agente pode enviar:

```json
{"type":"agent_hello","device_id":"device-id"}
```

E recebe um `agent_ack`. Mensagens `ping` recebem `pong`. Jobs ainda não são enviados nesta primeira etapa: antes disso precisamos validar o endpoint, o proxy e o pareamento.

## Configuração no Dokploy

1. No serviço do projeto, abra as variáveis de ambiente.
2. Adicione `JARVIS_WSS_ACCESS_TOKEN` com um segredo forte.
3. Faça um novo deploy/restart do serviço para carregar a variável.
4. No proxy do domínio `jarvis.kryontech.com.br`, encaminhe `/ws/local-agent` para a porta interna do Nitro, mantendo os cabeçalhos `Upgrade` e `Connection`.
5. Mantenha TLS ativo no domínio para que o endereço público seja `wss://`, nunca `ws://`.

Exemplo de bloco Nginx, caso o proxy permita configuração manual:

```nginx
location /ws/local-agent {
  proxy_pass http://jarvis-app:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 3600s;
  proxy_send_timeout 3600s;
}
```

O nome `jarvis-app:3000` é apenas ilustrativo e deve ser substituído pelo serviço interno real no Dokploy.

## Estado desta etapa

Implementado no código: rota WSS, autenticação por Bearer token, limite de mensagem, mensagens de conexão/ack/ping e heartbeat.

Ainda depende da infraestrutura: variável secreta no Dokploy, TLS do domínio e proxy com suporte a WebSocket. Jobs assinados e pareamento de dispositivo serão implementados depois da validação desta conexão básica.
