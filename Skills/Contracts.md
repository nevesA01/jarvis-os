# Contratos

S0: consultiva, texto e análise sem ferramentas. S1: leitura autorizada, sem alteração de estado e com logs. S2: escrita reversível com confirmação e rollback. S3: escrita externa com aprovação transacional e auditoria. S4: crítica/destrutiva com reautenticação, hash, executor isolado, rollback e kill switch.

Nenhuma skill deste lote executa ferramentas. O futuro envelope de Tool Runner deve incluir tool_execution_id, task_id, skill_id, agent_id, user_id, input_hash, status, started_at, completed_at, sanitized_result, error_class e audit_reference.
