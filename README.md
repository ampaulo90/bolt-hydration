# BOLT Hydration - Free Edition

Sistema gratuito de notificações inteligentes para hidratação com mensagens inspiracionais cristãs, integrado com Microsoft Teams.

## Visao Geral

O BOLT Hydration envia lembretes de hidratação automaticamente para o Microsoft Teams, com:
- 300 mensagens inspiracionais (100 versículos bíblicos + 200 mensagens motivacionais)
- Sistema anti-repetição que reinicia automaticamente após usar todas as mensagens
- Dashboard web responsivo para visualização de progresso
- Agendamento automático 100% gratuito

## Stack Tecnologica

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Notificacoes**: Microsoft Teams via Incoming Webhook

## Configuracao Rapida

### 1. Criar Webhook do Microsoft Teams

1. Abra o Microsoft Teams
2. Vá para o canal onde deseja receber notificações
3. Clique nos 3 pontos (...) > Conectores
4. Procure por "Incoming Webhook"
5. Clique em "Adicionar"
6. Dê um nome (ex: "BOLT Hydration")
7. Copie a URL do webhook gerada

### 2. Configurar Agendamento Gratuito

O sistema usa a Edge Function `cron-check` que pode ser chamada por qualquer serviço de cron gratuito:

#### Opcao A: cron-job.org (RECOMENDADO - 100% Gratuito)

1. Acesse [cron-job.org](https://cron-job.org) e crie uma conta gratuita
2. Clique em "Create Cronjob"
3. Configure:

| Horário | URL | Nome do Job |
|---------|-----|-------------|
| 08:15 (Hora local) | `https://zzwkopohxzujnthdwcog.supabase.co/functions/v1/cron-check` | bolt-0815 |
| 09:45 | mesma URL | bolt-0945 |
| 11:30 | mesma URL | bolt-1130 |
| 13:45 | mesma URL | bolt-1345 |
| 15:15 | mesma URL | bolt-1515 |
| 16:45 | mesma URL | bolt-1645 |

4. Em cada job, configure:
   - **URL**: `https://zzwkopohxzujnthdwcog.supabase.co/functions/v1/cron-check`
   - **Request method**: POST
   - **Headers**:
     ```
     Content-Type: application/json
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d2tvcG9oeHp1am50aGR3Y29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg1OTUsImV4cCI6MjA5NzEwNDU5NX0.1X3Tz0-bECQdAShcvq_FdIFEZ5vKCadP8YeE7APfL8A
     ```
   - **Body**:
     ```json
     {
       "webhook_url": "COLE_SUA_URL_DO_TEAMS_AQUI"
     }
     ```
   - **Schedule**: Segunda a Sexta (ou conforme preferir)
   - **Enabled**: Apenas dias úteis (desmarque sábado e domingo)

#### Opcao B: EasyCron (Alternativa Gratuita)

1. Acesse [easycron.com](https://easycron.com)
2. Crie uma conta gratuita
3. Configure os mesmos parâmetros acima

#### Opcao C: GitHub Actions (Requer Publicacao)

1. Publique este projeto no GitHub
2. Vá em Settings > Secrets and variables > Actions
3. Adicione os secrets:
   - `EDGE_FUNCTION_URL`: `https://zzwkopohxzujnthdwcog.supabase.co/functions/v1/cron-check`
   - `SUPABASE_ANON_KEY`: (chave anônima do Supabase)
   - `TEAMS_WEBHOOK_URL`: sua URL do webhook do Teams
4. Habilite os workflows

## Horarios Configurados

**Segunda a Quinta:**
- 08:15, 09:45, 11:30, 13:45, 15:15, 16:45
- Meta: 3000ml (6 doses de 500ml)

**Sexta:**
- 08:15, 09:45, 11:30, 13:45, 15:15
- Meta: 2500ml (5 doses de 500ml)

**Sabado e Domingo:**
- Sem notificações (descanso!)

## Formato da Notificacao

Cada notificação enviada ao Teams segue este formato:

```
💧 BOLT HIDRATACAO

Horario: 15:15
Garrafa: 5/6
Ação:
□ Buscar água
□ Beber 500 ml

Progresso:
2500 ml / 3000 ml

"Tudo o que fizerem, façam de todo o coração."
Colossenses 3:23
```

## Testar Manualmente

Para testar se as notificações estão funcionando:

```bash
curl -X POST "https://zzwkopohxzujnthdwcog.supabase.co/functions/v1/cron-check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d2tvcG9oeHp1am50aGR3Y29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg1OTUsImV4cCI6MjA5NzEwNDU5NX0.1X3Tz0-bECQdAShcvq_FdIFEZ5vKCadP8YeE7APfL8A" \
  -d '{"webhook_url": "SUA_URL_DO_TEAMS", "force": true}'
```

## Estrutura do Banco de Dados

- **messages**: 300 mensagens inspiracionais categorizadas
- **hydration_config**: Configuração de horários por dia da semana
- **message_usage**: Controle de mensagens já utilizadas
- **notification_logs**: Histórico de notificações enviadas
- **daily_progress**: Progresso diário e sequência de dias

## Personalizar Horarios

Edite a tabela `hydration_config` no Supabase:

```sql
UPDATE hydration_config
SET times = '["08:00", "10:00", "12:00", "14:00", "16:00"]'::jsonb,
    daily_goal_ml = 2500
WHERE day_of_week = 1; -- Segunda-feira
```

## Adicionar Novas Mensagens

```sql
INSERT INTO messages (content, reference, category)
VALUES ('Sua nova mensagem aqui.', NULL, 'health');
```

## Solução de Problemas

### Notificações não chegam

1. Teste manualmente com o comando curl acima
2. Verifique se a URL do webhook está correta
3. Confirme que o serviço de cron está ativo

### Mensagem "No notification scheduled"

Isso é normal se:
- For final de semana (sábado/domingo)
- O horário atual não coincidir com um horário programado
- Use `{"force": true}` para enviar mesmo assim

### Logs e Debug

Acesse o Supabase Dashboard > Edge Functions > cron-check > Logs para ver os logs de execução.

## Seguranca

- Nunca compartilhe a URL do webhook publicamente
- A URL do webhook pode ser regenerada no Teams se necessário
- Use variáveis de ambiente para credenciais em produção

## Licenca

MIT License - Use livremente para fins pessoais ou comerciais.

---

Desenvolvido com fé e propósito.
