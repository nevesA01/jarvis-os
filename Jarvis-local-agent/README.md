# Jarvis Local Agent — Windows 11

Agente local de menor privilégio para o Jarvis. O componente usa **somente conexão de saída WSS** quando configurado, não abre portas no computador e não fornece shell, PowerShell, CMD, scripts livres, Docker socket, SSH, banco local, gerenciador de senhas ou automação financeira.

## O que está funcionando no código

- Identidade de dispositivo com chave Ed25519 e proteção da chave privada pelo DPAPI do Windows.
- Jobs Pydantic com campos obrigatórios, assinatura, nonce, expiração, dispositivo, risco, ferramenta e `action_hash`.
- Política local YAML com prioridade sobre pedidos remotos.
- WSS de saída com validação TLS, heartbeat e reconexão exponencial.
- Perfil Playwright persistente isolado `Jarvis-Automation`.
- Allowlist de domínios e esquemas `http`/`https`; redirects são revalidados.
- Leitura de título, URL, texto visível, links seguros, busca na página e screenshot.
- Preenchimento de campos sem submit.
- Preview de formulário.
- Submit ainda bloqueado por padrão, sem domínio de teste configurado.
- Workspace exclusiva `~/JarvisWorkspace/` com `Inbox`, `Drafts`, `Exports`, `Downloads-quarantine` e `Projects-approved`.
- Leitura controlada, criação sem overwrite em drafts/exports e quarentena de downloads não executáveis.
- Bloqueio de traversal, symlinks, `.env`, credenciais, cookies, histórico, executáveis e exclusão.
- Janela nativa Tk para aprovação L3 com preview, hash e expiração curta; aprovação por voz não é aceita.
- Auditoria local sanitizada e kill switch.
- Detecção de conteúdo suspeito de prompt injection como dado não confiável.

## Limites deliberados

- L4 permanece desabilitado.
- Nenhum domínio é permitido por padrão. O operador precisa editar a política local e incluir apenas domínios de teste explicitamente autorizados.
- Não há upload implementado.
- Não há compra, pagamento, transferência, login automatizado, criação de conta, alteração de permissões ou aceite de termos.
- Não há Browser.execute_javascript.
- Não existe servidor HTTP local nem listener de entrada.
- A conexão real só funciona quando a VPS fornecer endpoint WSS, token curto e chave pública de assinatura compatíveis com o protocolo.

## Instalação no Windows 11

Pré-requisitos:

- Windows 11.
- Python 3.11+.
- Microsoft Edge/Chromium compatível ou Chromium gerenciado pelo Playwright.
- Endpoint WSS da VPS e fluxo de pareamento já configurados.

Em `Jarvis-local-agent`, crie o ambiente e instale:

```text
py -3.11 -m venv .venv
.venv\\Scripts\\python -m pip install --upgrade pip
.venv\\Scripts\\python -m pip install -e ".[test]"
.venv\\Scripts\\python -m playwright install chromium
```

Configure as variáveis do `.env.example` no ambiente do usuário. Nunca salve tokens reais ou chaves privadas no repositório.

Para iniciar o runtime configurado:

```text
.venv\\Scripts\\python -m app.main
```

O runtime recusa qualquer URL que não seja `wss://`. Se `JARVIS_VPS_WSS_URL` ou `JARVIS_ACCESS_TOKEN` não forem configurados, ele não conecta.

## Política e allowlist

Edite `app/policies/default_policy.yaml` somente com revisão humana. Para testes, `allowed_domains` deve conter domínios sem dados sensíveis, por exemplo `example.test` ou um domínio interno de laboratório. Não inclua banco, e-mail principal, redes sociais, pagamentos ou contas administrativas.

A política padrão permite apenas as ferramentas fechadas listadas no YAML. A política do computador sempre prevalece sobre o job remoto.

## Testes

```text
.venv\\Scripts\\python -m pytest
```

Os testes cobrem assinatura inválida, expiração, replay, dispositivo incorreto, hash alterado, aprovação expirada, kill switch, URLs não permitidas, esquema `javascript:`, redirects, traversal, symlinks, extensões executáveis, download inseguro, overwrite e prompt injection.

## Estado de validação

### Implementado no código

Os módulos e testes estão no repositório.

### Ambiente configurado

O projeto está preparado para Windows 11, mas o endpoint WSS, token, chave pública da VPS e allowlist de domínio ainda dependem da infraestrutura real.

### Validado em dispositivo real

Ainda não validado neste ambiente: instalação real no Windows 11, navegador Chromium, DPAPI, janela nativa, endpoint WSS e pareamento com a VPS. Isso não deve ser reportado como concluído sem execução e evidência no equipamento real.

## Rollback

1. Encerre o processo do agente.
2. Remova o diretório `Jarvis-local-agent`.
3. Remova o diretório de dados configurado em `JARVIS_AGENT_DATA_DIR`.
4. Exclua `JarvisWorkspace` somente após revisar os arquivos gerados.
5. Revogue o dispositivo e o token no painel da VPS.

O componente não modifica o frontend, não instala serviço do Windows e não cria uma porta de entrada.
