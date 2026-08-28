# 📍 Onde paramos — Precifica3D

> **Para retomar, cole isto no Claude Code dentro da pasta do projeto:**
>
> ```
> Leia CONTINUAR.md e siga de onde paramos.
> ```

Última atualização: **28/08/2026**

---

## 🔴 PRIMEIRA COISA AO VOLTAR (o banco local morre quando o PC desliga)

**Terminal 1 — deixa aberto, é o banco:**
```bash
cd precifica3d
npm run db:dev
```
Ele imprime uma `DATABASE_URL`. **Se a porta mudar**, cole a nova no
`precifica3d/.env` (linhas `DATABASE_URL` e `SHADOW_DATABASE_URL`).

**Terminal 2 — o app:**
```bash
cd precifica3d
npm run dev            # http://localhost:3000
```

Se o banco estiver vazio, recrie o esquema e os dados:
```bash
npm run db:migrate
npm run db:seed        # ⚠️ imprime SENHAS NOVAS — anote as duas
```

⚠️ **O `npm run dev` não recarrega sozinho quando você salva.** O projeto está
num drive do Windows visto de dentro do WSL, e ali o Linux não recebe aviso de
arquivo alterado. Depois de editar, `Ctrl+C` e suba de novo. Mover o repositório
para dentro do WSL (`~/projetos/`) resolve de vez.

---

## ✅ O aplicativo está completo e funcionando

Todas as 10 etapas do plano original foram entregues. `npm run typecheck`,
`npm test` (70 testes) e `next build` (26 rotas) passam.

### Telas

| Área | O que tem |
|---|---|
| **Acesso** | entrar · cadastrar · esqueci-senha · redefinir · definir (convite) · verificar e-mail · trocar senha |
| **Painel** | resumo, pendências que atrapalham o cálculo, estoque baixo, peças recentes, preço de insumo, últimas movimentações |
| **Materiais** | lista agrupada por categoria com busca e filtros · cadastro por categoria · detalhe com extrato auditável · baixa/reposição/correção de contagem · histórico de preço |
| **Peças** | lista · formulário com **prévia de preço ao vivo** · detalhe com 3 faixas, custo detalhado, risco e produtividade · histórico de cálculo · "produzi esta peça" baixa o estoque |
| **Fotos** | duas galerias (venda e fabricação) · arrastar-soltar e **Ctrl+V** · capa do anúncio |
| **Mercado** | câmbio, inflação, preço por tipo e por loja · gráficos de 90 dias · coleta manual · diagnóstico de qual coletor falhou |
| **Ajustes** | impressoras · energia · mão de obra · margem e taxas · quem tem acesso (convites e papéis) |

### Decisões que valem lembrar

**O motor de preço roda nos dois lados.** É TypeScript puro, sem banco: no
navegador ele dá a prévia que muda a cada tecla; no servidor, produz o valor
gravado. `src/core/pricing/montar.ts` é a ponte — os dois lados montam a
entrada com a mesma função, então a tela nunca mostra um preço e o banco
guarda outro.

**A peça recalcula com os preços de hoje.** Ao abrir uma peça salva, o cálculo
é refeito e comparado com o snapshot do dia em que ela foi criada. É assim que
aparece o aviso "o filamento subiu e seu anúncio ficou defasado".

**Isolamento entre ateliês vem da sessão, não do formulário.** Todo `where` de
consulta usa o `workspaceId` de `exigirContexto()`. O `proxy.ts` só faz
redirect otimista olhando o cookie — quem decide é a página.

**Tudo funciona sem JavaScript**, menos o formulário de peça (que precisa da
prévia ao vivo) e o envio de fotos. Os testes de ponta a ponta usaram
justamente esse caminho.

### Dois defeitos encontrados e corrigidos

1. **`z.coerce.number()` transformava `null` em `0`.** Em `refugoManualPct`,
   isso o motor lia como "taxa de refugo fixada em 0%" e **desligava a reserva
   de quebra inteira**. A peça de teste saía a R$ 244 em vez de R$ 272 — quase
   R$ 28 sumindo por peça, em silêncio. Corrigido com `.nullish()` e travado
   por teste (`src/app/(app)/projetos/esquema.test.ts`).
2. **`actions.ts` exportava uma constante.** Arquivo `"use server"` só pode
   exportar funções async; isso quebrava o build. Movido para `estado.ts`.

---

## 🔨 O que ainda dá para melhorar

Nada disto bloqueia o uso — são refinamentos.

- **Ordenar fotos arrastando.** Hoje a ordem é a de envio, e a capa se escolhe
  por botão.
- **Alertas automáticos.** A tabela `Alert` existe e o painel já sabe mostrá-los,
  mas ninguém os cria ainda. Candidatos naturais: preço de insumo subiu acima da
  inflação, estoque cruzou o mínimo, peça com margem abaixo do mínimo.
- **Duplicar peça.** Ele vai querer partir de uma parecida em vez de preencher
  tudo de novo.
- **Exportar.** Uma lista de preços em PDF ou planilha, para levar à feira.
- **Coletor da 3D Lab.** Continua bloqueado por Cloudflare; degrada sem quebrar.

---

## ⚙️ Pendências suas (não dá pra eu fazer)

| O quê | Onde | Por quê |
|---|---|---|
| **E-mail real do Felipe** | me passar | o seed usou `felipe@exemplo.com.br` |
| **Conta no Brevo** | brevo.com | 300 e-mails/dia grátis. Verificar um remetente e pegar a chave SMTP |
| **Projeto no Supabase** | supabase.com | Postgres de produção + bucket **público** `fotos` |
| Preços reais dos materiais | dentro do app | os 28 estão marcados como estimados |
| Conta de luz (valor + kWh) | Ajustes → Energia | hoje o R$/kWh vem de estimativa |
| Confirmar specs da Kobra X | Ajustes → Impressoras | valor pago, volume, potência |
| Credencial do Mercado Livre | developers.mercadolivre.com.br | opcional |

O passo a passo do deploy está no `precifica3d/README.md`.

---

## 🗂️ Mapa do projeto

```
precifica3d/
├── prisma/schema.prisma       25 tabelas, multi-tenant
├── vercel.json                cron diário às 12h UTC (9h de Brasília)
└── src/
    ├── core/                  domínio PURO — zero I/O, roda no cliente e no servidor
    │   ├── pricing/           motor de preço · montagem da entrada · testes
    │   ├── materiais/         categorias e custo unitário
    │   └── validation/        política de senha · e-mail
    ├── server/                camada de I/O
    │   ├── auth/ mail/ market/ storage/ queries/ workspace/ db/
    ├── app/
    │   ├── (auth)/            telas de acesso
    │   ├── (app)/             app logado
    │   └── api/cron/mercado/  rotina diária, protegida por CRON_SECRET
    ├── components/            interface compartilhada
    └── proxy.ts               redirect otimista (Next 16; era middleware.ts)
```

## 🧪 Comandos

```bash
npm run dev              # servidor
npm test                 # 70 testes (os de banco se pulam se ele estiver fora)
npm run typecheck        # tipos
npm run db:studio        # navegador visual do banco
npm run check:pricing    # motor de preço com um caso realista
npm run check:market     # coletores de verdade, contra a internet
```

## 🔒 Segurança — não quebrar

- `.env` está no `.gitignore` e **nunca** foi commitado. Confirmado.
- `AUTH_SECRET` novo por ambiente. Trocar invalida sessões e links pendentes.
- `SUPABASE_SERVICE_ROLE_KEY` só no servidor — nunca com prefixo `NEXT_PUBLIC_`.
- `CRON_SECRET` obrigatório: **sem ele a rota de cron responde 404 para todos**,
  nunca aberta.
- Em produção use a URL do **pooler** do Supabase (porta 6543), não a direta.
