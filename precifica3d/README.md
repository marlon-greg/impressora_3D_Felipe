# Precifica3D

Calcula quanto cobrar por uma peça impressa em 3D — considerando filamento,
energia, desgaste da impressora, tinta, embalagem, **o seu tempo** e a chance
de a peça sair errada.

Não é uma calculadora de custo. É uma ferramenta que mostra *onde o dinheiro
está indo*, porque quase sempre a resposta surpreende: numa peça típica, a mão
de obra pesa mais que o plástico.

---

## O que ele faz

- **Preço em três faixas** — mínimo (não dá prejuízo), ideal e premium — com o
  detalhamento de cada centavo do custo.
- **Distingue markup de margem líquida.** Com o mesmo 60%, markup dá 1,6× o
  custo e margem líquida dá 2,5×. Confundir os dois é o erro nº 1 de quem vende
  peça 3D.
- **Trata as taxas por divisão, não por soma.** Se o marketplace fica com 15%,
  o preço é `custo × (1 + markup) ÷ (1 − taxas)` — somar a taxa à margem come o
  lucro em silêncio.
- **Reserva para refugo por score de risco.** Peça alta, de paredes finas e 18 h
  de impressão não pode ser precificada como uma de 40 min.
- **Estoque com extrato auditável.** Toda baixa fica registrada com o saldo
  depois dela; produzir uma peça baixa os insumos num clique.
- **Preço de mercado em cache.** Câmbio, inflação e preço de filamento nas lojas
  brasileiras. Nenhuma tela chama API externa — se um site sair do ar, o app
  continua servindo o último valor bom, marcado como desatualizado.
- **Recalcula com os preços de hoje.** Ao abrir uma peça salva, o cálculo é
  refeito e comparado com o do dia em que você a criou: é assim que você
  descobre que o filamento subiu e seu anúncio ficou defasado.

---

## Rodando na sua máquina

Precisa de Node 20+.

```bash
npm install
cp .env.example .env          # preencha AUTH_SECRET (veja dentro do arquivo)
```

**Terminal 1 — o banco de desenvolvimento** (é um processo, morre quando você
fecha):

```bash
npm run db:dev
```

Ele imprime uma `DATABASE_URL`. Se a porta mudar, cole a nova no `.env`.

**Terminal 2 — esquema, dados e servidor:**

```bash
npm run db:migrate     # cria as tabelas
npm run db:seed        # materiais e usuários de exemplo
npm run dev            # http://localhost:3000
```

> O seed imprime **senhas novas a cada banco novo**. Anote as que aparecerem.

Com `MAIL_PROVIDER=console` nenhum e-mail é enviado de verdade: o link de
confirmação aparece no terminal do servidor, dentro de uma caixa `📧 E-MAIL
SIMULADO`.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes (domínio puro + integração, se o banco estiver de pé) |
| `npm run typecheck` | confere os tipos |
| `npm run db:studio` | navegador visual do banco |
| `npm run db:seed` | recria os dados de exemplo |
| `npm run check:pricing` | roda o motor de preço com um caso realista |
| `npm run check:market` | executa os coletores de verdade, contra a internet |
| `npm run market:collect` | coleta e grava no banco |

### Windows + WSL

Se o repositório estiver num drive do Windows (`/mnt/c/...`) visto de dentro do
WSL, **o `npm run dev` não recarrega sozinho ao salvar**: o Linux não recebe os
avisos de alteração de arquivo através dessa montagem. Pare com `Ctrl+C` e suba
de novo. Mover o repositório para dentro do WSL (`~/projetos/`) resolve.

---

## Como está organizado

```
src/
├── core/            domínio PURO — zero I/O, testável isolado
│   ├── pricing/     motor de preço + montagem da entrada
│   ├── materiais/   categorias e custo unitário
│   └── validation/  política de senha, normalização de e-mail
├── server/          camada de I/O
│   ├── auth/        hash, sessão, tokens, rate limit, auditoria
│   ├── mail/        adaptadores console/SMTP/Resend + templates
│   ├── market/      coletores + cache + leitura
│   ├── storage/     fotos no Supabase Storage
│   ├── queries/     consultas de tela
│   ├── workspace/   contexto e guardas de acesso
│   └── db/          client do Prisma
├── app/
│   ├── (auth)/      telas de acesso
│   ├── (app)/       app logado
│   └── api/cron/    rotina diária
├── components/      interface compartilhada
└── proxy.ts         redirect otimista (Next 16; era `middleware.ts`)
```

O motor de preço é TypeScript puro justamente para poder rodar **nos dois
lados**: no navegador, dando a prévia que muda enquanto você digita; e no
servidor, produzindo o valor que fica gravado. Mesma função, mesmo resultado.

### Isolamento entre ateliês

Todo dado de negócio pertence a um `Workspace`. Quem se cadastra por fora ganha
o próprio e não enxerga nada dos outros. Isso é garantido pelo `workspaceId`
que vem da **sessão** em toda consulta — nunca do formulário. O `proxy.ts` só
faz redirecionamento otimista olhando o cookie: quem decide é `exigirContexto()`
dentro de cada página.

---

## Deploy

### 1. Banco — Supabase

Crie um projeto em [supabase.com](https://supabase.com). Em *Project Settings →
Database*, copie a connection string do **pooler (porta 6543)**, não a direta:
o plano gratuito tem poucas conexões e cada invocação serverless abre uma.

```
DATABASE_URL="postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Aplique o esquema uma vez, da sua máquina:

```bash
DATABASE_URL="...pooler..." npm run db:deploy
```

### 2. Fotos — Supabase Storage

Em *Storage*, crie um bucket **público** chamado `fotos`. Pegue a
`service_role key` em *Project Settings → API*.

> A `SUPABASE_SERVICE_ROLE_KEY` ignora todas as políticas de acesso. Ela nunca
> pode ter o prefixo `NEXT_PUBLIC_` — com ele iria para o navegador e daria a
> qualquer visitante poder total sobre o bucket.

### 3. E-mail — Brevo

300 e-mails/dia grátis e entrega para qualquer endereço, sem exigir domínio
próprio. Verifique um remetente em *Senders & IP* e pegue a chave em *SMTP &
API → SMTP*. Preencha `MAIL_PROVIDER=smtp` e as variáveis `SMTP_*`.

### 4. Vercel

Importe o repositório e preencha as variáveis de ambiente:

| Variável | Observação |
|---|---|
| `DATABASE_URL` | pooler do Supabase, porta 6543 |
| `AUTH_SECRET` | **gere uma nova**: `openssl rand -base64 48` |
| `APP_URL` | `https://seu-app.vercel.app` — entra nos links do e-mail |
| `MAIL_PROVIDER` `MAIL_FROM` `SMTP_*` | credenciais do Brevo |
| `SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` `SUPABASE_BUCKET` | fotos |
| `CRON_SECRET` | `openssl rand -base64 32` — protege a rotina diária |
| `EXIGIR_EMAIL_VERIFICADO` | deixe `true` |

O `vercel.json` já agenda a coleta diária às 12h UTC (9h de Brasília, com o
mercado já aberto). O plano Hobby permite uma execução por dia — daí a validade
dos coletores ser medida em horas.

A rota `/api/cron/mercado` exige o `CRON_SECRET` no header `Authorization:
Bearer …`. **Sem o segredo configurado ela responde 404 para todo mundo**, e não
"aberta": um deploy com variável faltando não pode virar porta destrancada.

Para disparar à mão:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://seu-app.vercel.app/api/cron/mercado
```

### 5. Primeiro acesso

Cadastre-se pela tela `/cadastrar`. Você vira dono do seu ateliê. Depois convide
quem for trabalhar com você em *Ajustes → Quem tem acesso* — a pessoa recebe um
link e cria a própria senha; você nunca vê nem define a senha dela.

---

## Segurança

- Senha com **scrypt** nativo, parâmetros versionados dentro do próprio hash.
- Sessão no banco, não JWT: o cookie leva um token aleatório de 256 bits e o
  banco guarda só o SHA-256 dele. Precisa expulsar alguém agora? Apague a linha.
- Toda senha nova é conferida contra o **HaveIBeenPwned** por k-anonimity — só
  os 5 primeiros caracteres do hash saem do servidor; a senha, nunca.
- Rate limit no banco (não em memória: em serverless cada invocação teria o
  próprio contador) com bloqueio progressivo.
- Resposta neutra no cadastro e no "esqueci a senha", para não entregar quem
  tem conta.
- Trilha de auditoria e fila de e-mail com retentativa.
- O `.env` está no `.gitignore` e nunca foi versionado.
