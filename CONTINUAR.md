# 📍 Onde paramos — Precifica3D

> **Para retomar, cole isto no Claude Code dentro da pasta do projeto:**
>
> ```
> Leia CONTINUAR.md e siga de onde paramos.
> ```

Última atualização: **27/08/2026**

---

## 🔴 PRIMEIRA COISA AO VOLTAR (o banco local morre quando o PC desliga)

O banco de desenvolvimento roda como um processo local. Quando você desliga o
PC, ele para. Rode, **em dois terminais separados**, dentro de `precifica3d/`:

**Terminal 1 — deixa aberto, é o banco:**
```bash
cd precifica3d
npm run db:dev
```
Ele imprime uma `DATABASE_URL`. **Se a porta mudar**, cole a nova no arquivo
`precifica3d/.env` (linhas `DATABASE_URL` e `SHADOW_DATABASE_URL`).

**Terminal 2 — recria o esquema e os dados:**
```bash
cd precifica3d
npm run db:migrate      # aplica as tabelas
npm run db:seed         # recria materiais + usuários
```

⚠️ **O seed imprime SENHAS NOVAS a cada banco novo.** Anote as duas que
aparecerem — as anteriores não valem mais.

---

## ✅ O que já está pronto e testado

### Banco de dados — completo
Schema Prisma com 25 tabelas, migration aplicada. Isolamento por **Workspace**:
você e o Felipe dividem o mesmo; quem se cadastrar de fora ganha um próprio e
não enxerga os dados de vocês.

### Autenticação — completa no servidor, faltam telas
- Hash de senha com **scrypt** nativo (parâmetros versionados no registro)
- Sessão no banco: cookie httpOnly + secure + sameSite=lax, só o hash SHA-256 é guardado
- Senha forte: mínimo 10 caracteres, 3 classes, sem sequência, sem conter o nome
- **Checagem contra vazamentos reais** via HaveIBeenPwned (k-anonymity — a senha nunca sai do servidor). Testado: `password123` aparece em 2.266.543 vazamentos
- Rate limit no banco com bloqueio progressivo
- Resposta neutra no cadastro e no "esqueci a senha" (não dá pra descobrir quem tem conta)
- Trilha de auditoria + fila de e-mail com retentativa
- Fluxos prontos: cadastrar, entrar, verificar e-mail, esqueci a senha, definir senha por link, trocar senha, convidar

### Motor de precificação — completo e testado (`npm run check:pricing`)
Calcula: filamento (com desperdício) · energia (R$/kWh real da conta) ·
depreciação · manutenção · acabamento · arquivo/licença · mão de obra ·
custo indireto · embalagem · **reserva de refugo por score de risco**.

Distingue **markup** de **margem líquida** — a confusão que mais faz vendedor
de peça 3D precificar errado. E trata as taxas por divisão:
`preço = custo × (1 + markup) ÷ (1 − taxas)`.

### Coleta de mercado — funcionando (`npm run check:market`)
| Coletor | Estado |
|---|---|
| Câmbio USD/EUR (AwesomeAPI) | ✅ funcionando |
| IPCA/IGP-M (Banco Central) | ✅ funcionando |
| Preço de filamento — 3D Fila | ✅ funcionando (PETG R$ 96,90/kg, 9 amostras) |
| Preço de filamento — 3D Lab | ⚠️ bloqueado por Cloudflare (degrada sem quebrar) |
| Mercado Livre | ⏸️ precisa de credencial grátis (opcional) |

Nenhuma tela chama API externa: a coleta grava no banco e o app só lê do cache.
Testado com o Banco Central fora do ar — o app continuou servindo o valor antigo.

### Seed com os dados reais do Felipe
Impressora Kobra X · 4 rolos PETG Masterprint (preto, rosa, prata, dourado) ·
outras 3 marcas · 12 cores Acrilex (9×37ml + 1×250ml) · 2 pastas · primer ·
verniz · pincéis Condor · lixa · cola · embalagem. **28 materiais.**

Tudo que ele ainda não informou entrou como estimativa e está marcado
`precoEstimado: true` — a tela mostra um selo roxo "estimado".

### Interface — começou
- Design system (`globals.css`) com tokens de cor semânticos (lucro/prejuízo/atenção/estimado)
- Componentes base (`src/components/ui/index.tsx`)
- Campos de formulário + **medidor de força de senha** (`src/components/forms/campos.tsx`)
- Server Actions da autenticação (`src/app/(auth)/actions.ts`)

---

## 🔨 O QUE FALTA — nesta ordem

### 1. Telas de autenticação  ← **retomar exatamente aqui**
Criar em `src/app/(auth)/`:
- `entrar/page.tsx` — login + "esqueci minha senha" + reenviar verificação
- `cadastrar/page.tsx` — auto-cadastro com medidor de força
- `esqueci-senha/page.tsx`
- `redefinir-senha/page.tsx` — recebe `?token=`
- `definir-senha/page.tsx` — primeiro acesso por convite, recebe `?token=`
- `verificar-email/page.tsx` — recebe `?token=`
- `trocar-senha/page.tsx` — troca obrigatória do Felipe (`?obrigatorio=1`)
- `layout.tsx` — layout centralizado das telas de acesso

As Server Actions **já existem** em `src/app/(auth)/actions.ts`. As telas só
precisam usar `useActionState` com elas.

### 2. `proxy.ts` na raiz de `src/`
Redirect otimista lendo só o cookie (sem consultar o banco). Em Next 16 o
arquivo se chama `proxy.ts` e a função exportada é `proxy` — **não** mais
`middleware`. A checagem de verdade continua sendo `exigirSessao()` nas páginas.

### 3. Layout do app logado + navegação
`src/app/(app)/layout.tsx` com barra lateral, e bloqueio: quem tem
`precisaTrocarSenha` só acessa `/trocar-senha`.

### 4. Painel (dashboard)
Cards de resumo · alertas de estoque baixo · variação de preço dos insumos ·
últimas movimentações · projetos recentes.

### 5. Materiais (CRUD + estoque)
Lista com busca e filtro · formulário com campos por categoria · detalhe com
extrato de movimentações · **baixa rápida em um clique** · destaque para
estoque abaixo do mínimo.

### 6. Projetos — o coração
Wizard por etapas: dados da peça → origem do arquivo → impressão (filamento,
gramas, tempo) → pós-processamento → complexidade/risco → comercial.
Resultado: as 3 faixas de preço, o detalhamento do custo e os avisos.

### 7. Fotos
Upload pro Supabase Storage, arrastar-e-soltar + colar com Ctrl+V.
Duas galerias por peça: **fabricação** e **venda**.
(`src/server/storage/` ainda está vazio.)

### 8. Tela de mercado
Câmbio, inflação, preço do filamento por loja, gráfico de variação, botão de
forçar coleta, diagnóstico de qual coletor falhou.

### 9. Configurações
Impressoras · tarifa de energia · mão de obra · margem e taxas · membros do
ateliê (convidar o Felipe de verdade).

### 10. Fechamento
Testes do fluxo de token (geração, validação, expiração, reuso bloqueado) ·
`/api/cron/mercado` protegida por `CRON_SECRET` · `vercel.json` com o cron
diário · README com deploy.

---

## ⚙️ Pendências suas (não dá pra eu fazer)

| O quê | Onde | Por quê |
|---|---|---|
| **E-mail real do Felipe** | me passar | o seed usou `felipe@exemplo.com.br` como espaço reservado |
| **Conta no Brevo** | brevo.com | 300 e-mails/dia grátis. Verificar um remetente e pegar a chave SMTP. Preencher no `.env` conforme o `.env.example` |
| **Projeto no Supabase** | supabase.com | Postgres de produção + storage das fotos |
| Preços reais dos materiais | dentro do app | hoje tudo está estimado |
| Conta de luz (valor + kWh) | dentro do app | pro R$/kWh sair do valor real |
| Confirmar specs da Kobra X | me passar | valor pago, volume de impressão, potência |
| Credencial do Mercado Livre | developers.mercadolivre.com.br | opcional, liga o preço de venda praticado |

---

## 🗂️ Mapa do projeto

```
precifica3d/
├── prisma/
│   ├── schema.prisma          25 tabelas, multi-tenant
│   └── seed.ts                dados reais do Felipe
├── src/
│   ├── core/                  domínio PURO — zero I/O, testável isolado
│   │   ├── pricing/           motor de cálculo de preço
│   │   └── validation/        política de senha, normalização de e-mail
│   ├── server/                camada de I/O
│   │   ├── auth/              hash, sessão, tokens, rate limit, auditoria
│   │   ├── mail/              adaptadores console/SMTP/Resend + templates
│   │   ├── market/            coletores + cache + leitura
│   │   ├── db/                client do Prisma
│   │   └── storage/           (vazio — fotos)
│   ├── app/                   rotas Next.js
│   ├── components/            UI
│   └── config/env.ts          variáveis validadas com Zod
└── scripts/                   verificações rodáveis
```

## 🧪 Comandos

```bash
npm run dev              # servidor (localhost:3000)
npm run db:dev           # banco local — terminal separado
npm run db:seed          # recria os dados
npm run db:studio        # navegador visual do banco
npm run check:pricing    # testa o motor de preço
npm run check:market     # roda os coletores de verdade
npm run typecheck        # confere os tipos
```

## 🔒 Segurança — não quebrar

- `.env` está no `.gitignore` e **nunca** foi commitado. Confirmado.
- `AUTH_SECRET` novo por ambiente. Trocar invalida sessões e links pendentes.
- `SUPABASE_SERVICE_ROLE_KEY` só no servidor — nunca com prefixo `NEXT_PUBLIC_`.
- Em produção use a URL do **pooler** do Supabase (porta 6543), não a direta.
