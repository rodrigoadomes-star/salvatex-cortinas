# Segurança, operação e LGPD

## Controles obrigatórios

- Sessões individuais, cookies HttpOnly/Secure/SameSite e rotação.
- Autorização por função e empresa em todas as APIs.
- Auditoria de login, alteração de plano/taxa, domínio, usuário, pedido e exportação.
- Turnstile e limitação de tentativas em cadastro, login, recuperação e contato.
- Segredos exclusivamente nas variáveis protegidas do Cloudflare.
- R2 privado; documentos nunca possuem URL pública permanente.
- Logs não registram senha, token, CPF completo, documentos ou conteúdo integral de pagamento.

## Retenção sugerida para validação jurídica

- Sessões: remover após expiração.
- Tokens de recuperação: remover após uso ou expiração.
- Logs de segurança: período definido em contrato e política interna.
- Mensagens de contato: manter somente enquanto necessárias ao atendimento.
- Documentos fiscais: seguir obrigação fiscal aplicável.
- Contas canceladas: bloquear imediatamente e executar política documentada de retenção/exclusão.

Os períodos definitivos devem ser validados com assessoria jurídica e contábil brasileira.

## Continuidade

- Backup programado e teste de restauração.
- Exportação por empresa.
- Registro de versão e procedimento de rollback.
- Monitoramento de erros e disponibilidade.
- Processo documentado de transferência e encerramento de loja.
