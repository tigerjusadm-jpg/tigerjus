# 🐯 TIGERJUS — Guia Completo de Deploy
## Do Zero ao Ar em ~45 minutos

---

## PASSO 1 — Criar contas (10 min)

Crie as contas abaixo. Use o mesmo e-mail em todas:

| Serviço | Link | Para que serve |
|---------|------|----------------|
| GitHub | github.com | Guardar o código |
| Vercel | vercel.com | Hospedar o site |
| Supabase | supabase.com | Banco de dados e login |
| Anthropic | console.anthropic.com | IA jurídica |
| Mercado Pago | mercadopago.com.br/developers | Pagamentos |

---

## PASSO 2 — Configurar Supabase (8 min)

1. Entre em **supabase.com** → clique **"New Project"**
2. Nome: `tigerjus` | Senha forte | Região: **South America (São Paulo)**
3. Aguarde ~2 minutos enquanto o banco cria
4. Vá em **SQL Editor** (menu lateral) → **"New Query"**
5. Cole TODO o conteúdo do arquivo `supabase-schema.sql`
6. Clique **"Run"** → Aguarde "Success"
7. Vá em **Authentication → Providers**:
   - Ative **Email** (já vem ativo)
   - Ative **Google**: precisa criar projeto em console.cloud.google.com
8. Vá em **Settings → API** e copie:
   - `Project URL` → será seu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → será seu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → será seu `SUPABASE_SERVICE_ROLE_KEY`

---

## PASSO 3 — Pegar chaves de API (5 min)

### Anthropic (IA)
1. Entre em **console.anthropic.com**
2. API Keys → Create Key → copie a chave
3. Essa é sua `ANTHROPIC_API_KEY`

### Mercado Pago
1. Entre em **mercadopago.com.br/developers**
2. Suas Aplicações → Criar Aplicação → Nome: TigerJus
3. Vá em Credenciais de Produção
4. Copie `Access Token` → `MERCADOPAGO_ACCESS_TOKEN`
5. Copie `Public Key` → `MERCADOPAGO_PUBLIC_KEY`

---

## PASSO 4 — Subir código no GitHub (5 min)

1. Entre em **github.com**
2. Clique **"+"** → **"New repository"**
3. Nome: `tigerjus` | Marque **Public** | Clique **Create**
4. Na página seguinte, clique **"uploading an existing file"**
5. Selecione TODOS os arquivos desta pasta (exceto node_modules)
6. Clique **"Commit changes"**

> IMPORTANTE: Não suba o arquivo .env.local se ele existir!

---

## PASSO 5 — Deploy na Vercel (5 min)

1. Entre em **vercel.com** → **"Add New Project"**
2. Clique **"Import Git Repository"**
3. Conecte sua conta GitHub e selecione o repositório `tigerjus`
4. Em **Framework Preset**: selecione **Next.js**
5. Clique **"Environment Variables"** e adicione:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
ANTHROPIC_API_KEY = sk-ant-...
MERCADOPAGO_ACCESS_TOKEN = APP_USR-...
MERCADOPAGO_PUBLIC_KEY = APP_USR-...
NEXT_PUBLIC_APP_URL = https://tigerjus.com.br
NEXTAUTH_SECRET = (gere em https://generate-secret.vercel.app/32)
```

6. Clique **"Deploy"**
7. Aguarde ~3 minutos → Seu site estará em `tigerjus.vercel.app` ✅

---

## PASSO 6 — Conectar domínio .com.br (10 min)

### Na Vercel:
1. Vá em **Settings → Domains**
2. Digite `tigerjus.com.br` e clique **Add**
3. Adicione também `www.tigerjus.com.br`
4. Anote os valores de DNS que a Vercel mostrar (algo como `cname.vercel-dns.com`)

### No seu registrador .com.br (Registro.br ou similar):
1. Acesse o painel do seu domínio
2. Vá em **DNS** ou **Zona DNS**
3. Adicione os registros que a Vercel indicou:
   - Tipo: `CNAME` | Nome: `www` | Valor: `cname.vercel-dns.com`
   - Tipo: `A` | Nome: `@` | Valor: `76.76.21.21`
4. Aguarde até 24h para propagar (geralmente < 1h)

---

## PASSO 7 — Configurar Webhook Mercado Pago (3 min)

1. No Mercado Pago Developer → sua aplicação → **Webhooks**
2. URL: `https://tigerjus.com.br/api/webhooks/mercadopago`
3. Eventos: marque **Payments**
4. Salvar

---

## PASSO 8 — Testar tudo (5 min)

✅ Acesse `https://tigerjus.com.br`
✅ Clique "Começar Grátis" → cadastro funciona?
✅ Dashboard carrega?
✅ Quiz funciona?
✅ IA responde?
✅ Checkout aparece?

---

## 🔧 Após o deploy — Adicionar conteúdo real

Para adicionar questões reais ao banco:
1. Acesse o **Admin Panel** em `/admin`
2. Use a aba **Quizzes** para adicionar questões
3. Use a aba **Conteúdos** para adicionar resumos
4. Ou insira direto via SQL Editor no Supabase

### Inserir questão via SQL:
```sql
INSERT INTO public.questions (
  discipline_id, question, option_a, option_b, option_c, option_d,
  correct_option, explanation, difficulty, xp_reward
) VALUES (
  1, -- 1 = Constitucional
  'Qual o prazo para impetrar mandado de segurança?',
  '30 dias',
  '60 dias', 
  '90 dias',
  '120 dias',
  'D',
  'O prazo decadencial do MS é de 120 dias (art. 23, Lei 12.016/2009).',
  'medio',
  100
);
```

---

## 📊 Monitoramento

- **Usuários e receita**: `/admin`
- **Erros de deploy**: Vercel Dashboard → Functions → Logs
- **Banco de dados**: Supabase Dashboard → Table Editor
- **Pagamentos**: Mercado Pago Dashboard

---

## 💬 Suporte

Se travar em algum passo, o erro mais comum é variável de ambiente faltando.
Verifique em: Vercel → seu projeto → Settings → Environment Variables

---

**🐯 "Não basta estudar Direito. É preciso pensar como um Tigre."**
