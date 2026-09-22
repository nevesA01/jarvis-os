# Jarvis Local Agent — Fase A

Núcleo seguro para Windows 11, sem automação real. Esta etapa prepara validação local, política deny-by-default, pareamento simulado, auditoria sanitizada e controles de cancelamento.

## Estado honesto

### Código implementado

- Modelos Pydantic fechados para jobs, aprovações, auditoria e contexto.
- Assinatura Ed25519 e hash canônico de ação.
- Validação de dispositivo, assinatura, timestamp, expiração, nonce, política local e aprovação.
- Política YAML local com ferramentas vazias e L4 bloqueado.
- Pareamento simulado com código de uso único armazenado somente como hash.
- Armazenamento persistente de nonces com escrita atômica.
- Redação de tokens, cookies, senhas, autorização, 2FA e possíveis cartões nos logs.
- Detecção de padrões básicos de prompt injection em conteúdo não confiável.
- Kill switch, cancelamento e checkpoints.
- Roteador deliberadamente sem ferramentas executáveis.
- Testes automatizados dos controles da Fase A.

### Ambiente configurado

- Alvo principal: Windows 11.
- Python 3.11+.
- O componente não cria servidor HTTP, WebSocket, listener local ou porta de entrada.
- O frontend atual do Jarvis ainda possui uma integração legada que tenta `127.0.0.1:3210`; ela não é ativada por esta Fase A e não deve ser tratada como agente validado.

### Não validado em dispositivo real

- Instalação em Windows 11 real.
- Pareamento com a VPS.
- WSS de saída.
- Janela nativa de aprovação.
- Playwright ou navegador isolado.
- Filesystem workspace.
- Reconexão, heartbeat e revogação remota.

## Instalação no Windows 11

Abra um terminal Python em `Jarvis-local-agent` e crie um ambiente virtual:

```text
py -3.11 -m venv .venv
.venv\\Scripts\\python -m pip install --upgrade pip
.venv\\Scripts\\python -m pip install -r requirements.txt
```

Os comandos acima são apenas instruções de instalação documentadas; a Fase A não executa shell, PowerShell, CMD ou scripts livres por meio do agente.

## Testes

```text
.venv\\Scripts\\python -m pytest
```

## Política de segurança

A política padrão em `app/policies/default_policy.yaml` é local e tem precedência sobre qualquer pedido remoto. Na Fase A:

- nenhuma ferramenta é allowlisted;
- L4 está bloqueado;
- não existem domínios permitidos;
- não há abas, downloads ou passos de automação;
- shell, PowerShell, CMD, scripts, upload, submit, instalação, alteração de permissões, exclusão e sobrescrita estão bloqueados.

## Rollback

Remova o diretório `Jarvis-local-agent` e qualquer diretório de dados definido por `JARVIS_AGENT_DATA_DIR`. Nenhum arquivo do frontend, backend ou sistema operacional é alterado por este componente.

## Próxima etapa

A Fase B só deve ser iniciada após revisão da política e validação dos testes. Ela adicionará Playwright em perfil isolado, ainda sem preenchimento, upload ou submit.
