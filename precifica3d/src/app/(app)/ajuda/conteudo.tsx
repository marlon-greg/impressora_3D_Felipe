import Link from "next/link";
import type { ReactNode } from "react";

import { Aviso, Card, Etiqueta } from "@/components/ui";

/**
 * O manual do usuário.
 *
 * Mora dentro do app, e não num PDF, por um motivo prático: a dúvida nasce na
 * tela e a resposta precisa estar a um clique dali. PDF envelhece, some numa
 * pasta do Drive e ninguém lembra que existe.
 *
 * O texto aqui é o mesmo vocabulário das telas — "peça", "refugo", "faixa" —
 * para quem lê não precisar traduzir nada.
 */

// ── tipografia do manual ───────────────────────────────────────

export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-texto-suave">{children}</p>;
}

export function H({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-base font-semibold text-texto">{children}</h2>;
}

export function Lista({ itens }: { itens: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-texto-suave">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-marca-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Passos({ itens }: { itens: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-texto-suave">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-700 text-xs font-bold text-white"
          >
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** Caminho de menu: "Ajustes → Energia". Aparece muito, então tem forma própria. */
export function Onde({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-superficie-2 px-1.5 py-0.5 font-mono text-[0.8em] text-texto">
      {children}
    </span>
  );
}

export function Formula({ children, nota }: { children: ReactNode; nota?: ReactNode }) {
  return (
    <Card className="px-5 py-4">
      <p className="tabular text-sm font-semibold text-texto">{children}</p>
      {nota && <p className="mt-1.5 text-xs leading-relaxed text-texto-suave">{nota}</p>}
    </Card>
  );
}

// ── as seções ──────────────────────────────────────────────────

export interface Secao {
  slug: string;
  titulo: string;
  resumo: string;
  minutos: number;
  Corpo: () => ReactNode;
}

export const SECOES: Secao[] = [
  {
    slug: "primeiro-acesso",
    titulo: "Primeiro acesso",
    resumo: "Entrar, criar sua senha e deixar a conta pronta para uso.",
    minutos: 3,
    Corpo: () => (
      <>
        <P>
          Sua conta não nasce com uma senha que você escolheu — ela nasce com um convite. Isso é
          de propósito: ninguém, nem quem administra o ateliê, precisa saber a sua senha.
        </P>

        <H>Como entrar da primeira vez</H>
        <Passos
          itens={[
            <>
              Procure no e-mail a mensagem <strong className="text-texto">“Você foi convidado
              para o Precifica3D”</strong>. Se não achar na caixa de entrada, olhe em spam e em
              promoções.
            </>,
            <>
              Clique no link do convite. Ele abre a tela <Onde>Definir senha</Onde> já com o seu
              e-mail preenchido — você só escolhe a senha.
            </>,
            <>
              A senha precisa ter ao menos 10 caracteres e o sistema recusa senhas que já
              vazaram na internet. Se ele reclamar, não é implicância: aquela senha está em
              listas públicas.
            </>,
            <>
              Confirme. Você cai direto no <Onde>Painel</Onde>, já logado. Não precisa entrar de
              novo.
            </>,
          ]}
        />

        <Aviso nivel="atencao" titulo="O link do convite expira">
          Ele vale por tempo limitado e só pode ser usado uma vez. Se der “link inválido”, não
          tem problema: use <strong>Esqueci minha senha</strong> na tela de entrada, que um link
          novo chega em segundos.
        </Aviso>

        <H>Se te passaram uma senha provisória em vez de um convite</H>
        <P>
          Acontece quando a conta foi criada direto pelo sistema. Nesse caso você entra com ela
          uma única vez e o app te obriga a trocar antes de mostrar qualquer tela — não dá para
          pular. É a mesma regra: senha que outra pessoa conhece não é senha.
        </P>

        <H>Depois de entrar</H>
        <Lista
          itens={[
            <>
              Seu nome e e-mail ficam no rodapé da coluna da esquerda (no celular, no topo).
              Ali também está <strong className="text-texto">Trocar senha</strong> e o botão de
              sair.
            </>,
            <>
              Trocar a senha derruba as outras sessões. Se você entrou num computador emprestado
              e esqueceu de sair, troque a senha e o acesso de lá morre.
            </>,
            <>
              O que você pode fazer depende do seu papel: <Etiqueta tom="marca">operador</Etiqueta>{" "}
              usa o dia a dia, <Etiqueta tom="marca">admin</Etiqueta> também configura, e{" "}
              <Etiqueta tom="neutro">leitor</Etiqueta> só olha.
            </>,
          ]}
        />

        <P>
          Nunca fez nada disso ainda? O{" "}
          <Link href="/ajuda/simulador" className="font-semibold text-marca-700 underline dark:text-marca-400">
            simulador passo a passo
          </Link>{" "}
          mostra cada tela antes de você mexer de verdade.
        </P>
      </>
    ),
  },

  {
    slug: "como-o-preco-sai",
    titulo: "Como o preço é calculado",
    resumo: "Custo, reserva de refugo, margem e taxas — e por que as três faixas existem.",
    minutos: 6,
    Corpo: () => (
      <>
        <P>
          O sistema não “chuta” um preço. Ele soma custos reais, reserva uma parte para as peças
          que dão errado, põe a sua margem em cima e só então devolve o preço de etiqueta. Vale a
          pena entender a ordem, porque é ela que explica os números.
        </P>

        <H>1. Custo direto — o que sai do bolso</H>
        <Lista
          itens={[
            <><strong className="text-texto">Filamento</strong>: gramas da peça × preço do quilo, mais o desperdício (skirt, purga, suporte).</>,
            <><strong className="text-texto">Energia</strong>: horas de impressão × potência da máquina × o R$/kWh da sua conta de luz.</>,
            <><strong className="text-texto">Depreciação e manutenção</strong>: a impressora tem vida útil. Cada hora impressa gasta um pedaço dela.</>,
            <><strong className="text-texto">Acabamento</strong>: tinta, primer, verniz, lixa, cola — tudo que você lançou como material da peça.</>,
            <><strong className="text-texto">Mão de obra</strong>: as suas horas, ao valor/hora que você definiu. Costuma ser a maior linha, e é a que quase todo mundo esquece.</>,
            <><strong className="text-texto">Custo indireto</strong>: internet, aluguel do espaço, assinatura de software — o valor mensal dividido pelas horas produtivas do mês.</>,
            <><strong className="text-texto">Embalagem e frete embutido</strong>, quando você não cobra à parte.</>,
          ]}
        />

        <H>2. Reserva de refugo — a peça que quebrou também custou</H>
        <P>
          De cada dez impressões, alguma falha. Se você só cobra pelas que dão certo, as que
          falharam saem do seu lucro em silêncio. Por isso o sistema calcula um risco a partir da
          própria peça — suporte, paredes finas, peças móveis, multi-cor, encaixe preciso,
          altura, número de partes, tempo de impressão — e reserva uma porcentagem.
        </P>
        <P>
          A reserva não incide sobre tudo por igual: o que você gastou <em>antes</em> de imprimir
          (modelagem, preparo do arquivo) não se perde quando a peça falha, então fica de fora.
        </P>
        <Aviso nivel="info" titulo="Dá para fixar na mão">
          Se você já conhece sua taxa real de perda, escreva no campo de refugo manual e o
          cálculo automático sai de cena. Deixe vazio para o sistema estimar — vazio não é zero.
        </Aviso>

        <H>3. Margem — markup ou margem líquida</H>
        <P>
          Aqui mora o erro nº 1 de quem vende impressão 3D. Os dois se chamam “margem” e
          significam coisas diferentes:
        </P>
        <Formula nota="Quanto você põe em cima do custo. É como o vendedor pensa: “ponho 60% em cima”.">
          MARKUP · preço = custo × (1 + margem)
        </Formula>
        <Formula nota="Quanto do preço final é lucro. É como o contador pensa: “quero que 60% do que entra seja meu”.">
          MARGEM LÍQUIDA · preço = custo ÷ (1 − margem)
        </Formula>
        <P>
          Com 60% nos dois: markup dá 1,6× o custo. Margem líquida dá 2,5× o custo. O padrão do
          sistema é markup. Você troca em <Onde>Ajustes → Margem</Onde>, e a tela da peça sempre
          mostra a margem <em>real</em> ao lado, para não haver dúvida do que você está olhando.
        </P>

        <H>4. Taxas — elas saem por cima, não somadas</H>
        <P>
          Marketplace, maquininha e imposto não se somam à margem. Se você vende a R$ 100 e o
          canal fica com 15%, você recebe R$ 85 — então o preço se divide por (1 − taxas).
          Somar as duas coisas é o segundo erro mais comum, e é o que faz uma venda “com 60% de
          margem” terminar em 30%.
        </P>

        <H>As três faixas</H>
        <Lista
          itens={[
            <><strong className="text-texto">Mínimo</strong> — o piso. Abaixo daqui qualquer imprevisto vira prejuízo. Serve para negociar lote grande, não para tabelar.</>,
            <><strong className="text-texto">Ideal</strong> — paga o custo, o risco e o seu tempo. É o preço que você anuncia.</>,
            <><strong className="text-texto">Premium</strong> — peça exclusiva, prazo curto, cliente que valoriza. Não é ganância: é o preço de quem compra urgência.</>,
          ]}
        />

        <H>Ganho por hora — o número que abre o olho</H>
        <P>
          Abaixo das faixas o sistema mostra quanto você ganha por hora de máquina e por hora
          sua. É o número mais honesto da tela: uma peça pode parecer lucrativa e render R$ 6 por
          hora do seu trabalho. Aí não é o preço que está errado — é a peça que não vale a pena.
        </P>
      </>
    ),
  },

  {
    slug: "materiais",
    titulo: "Materiais e estoque",
    resumo: "Cadastrar, corrigir preço, dar baixa e entender o extrato.",
    minutos: 4,
    Corpo: () => (
      <>
        <P>
          Material é tudo que vira custo: filamento, tinta, primer, verniz, lixa, cola,
          embalagem. O preço que você lança aqui é o que alimenta o cálculo de toda peça que usa
          esse material — corrigir um preço aqui muda o preço de todas as peças que o usam.
        </P>

        <H>O selo “estimado”</H>
        <P>
          Todo material que o sistema criou sozinho nasce com o selo{" "}
          <Etiqueta tom="estimado">estimado</Etiqueta>. Quer dizer: esse preço é uma média de
          mercado, não a sua nota fiscal. Enquanto ele estiver ali, o preço da peça é um chute
          educado. Trocar pelos seus preços reais é a primeira coisa que faz o sistema virar
          verdade.
        </P>

        <H>Cadastrar</H>
        <Passos
          itens={[
            <>Em <Onde>Materiais</Onde>, toque em <strong className="text-texto">Novo material</strong> e escolha a categoria — ela define quais campos aparecem.</>,
            <>Informe o preço da <strong className="text-texto">embalagem cheia</strong> e o tamanho dela (o rolo de 1000 g, o pote de 37 ml). O sistema calcula o custo por grama sozinho.</>,
            <>Para itens que não se dividem — pincel, lixa, disco —, informe quantas peças o item rende. O custo entra rateado.</>,
            <>Informe o estoque atual e o mínimo. É o mínimo que faz o painel avisar antes de acabar, não depois.</>,
          ]}
        />

        <H>Estoque: as três movimentações</H>
        <Lista
          itens={[
            <><strong className="text-texto">Baixa</strong> — saiu material. Acontece sozinha quando você marca “produzi esta peça”.</>,
            <><strong className="text-texto">Reposição</strong> — comprou. Informe o preço pago e o sistema atualiza o custo e guarda o histórico.</>,
            <><strong className="text-texto">Correção de contagem</strong> — você contou a prateleira e o número não batia. Serve para acertar sem inventar uma compra que não houve.</>,
          ]}
        />

        <H>O extrato</H>
        <P>
          Cada material tem um extrato: toda movimentação, com data, motivo e quem fez. Se o
          estoque não bate, a resposta está ali — não é preciso adivinhar. O histórico de preço
          mostra a curva do que você pagou ao longo do tempo.
        </P>

        <Aviso nivel="info" titulo="Material usado não se apaga, se arquiva">
          Peças antigas apontam para ele. Apagar deixaria o custo daquelas peças sem explicação.
          Arquivar tira da lista de escolha e preserva a história.
        </Aviso>
      </>
    ),
  },

  {
    slug: "pecas",
    titulo: "Peças: do arquivo ao anúncio",
    resumo: "Cadastrar uma peça, ler o resultado e manter o preço atualizado.",
    minutos: 5,
    Corpo: () => (
      <>
        <P>
          A peça é o coração do sistema. Enquanto você preenche, o preço muda no lado da tela —
          não existe botão “calcular”. É o mesmo motor que grava o valor no banco, então o que
          você vê enquanto digita é exatamente o que fica salvo.
        </P>

        <H>O que preencher</H>
        <Passos
          itens={[
            <><strong className="text-texto">Nome e status</strong>. Rascunho enquanto você testa; anunciado quando entra na loja.</>,
            <><strong className="text-texto">Filamento e gramas</strong>. Use o número que o fatiador mostra. O desperdício (purga, skirt, suporte) entra à parte.</>,
            <><strong className="text-texto">Tempo de impressão</strong>, também do fatiador. É o que puxa energia e depreciação.</>,
            <><strong className="text-texto">Materiais de acabamento</strong>, se houver: tinta, primer, verniz.</>,
            <><strong className="text-texto">Seu trabalho</strong>, em horas: modelagem, preparo, pintura, montagem. Marque o que é feito antes da impressão — isso muda a reserva de refugo.</>,
            <><strong className="text-texto">Complexidade</strong>: suporte, paredes finas, peças móveis, multi-cor, encaixe preciso. Cada marca aumenta o risco calculado, e o sistema explica quais fatores pesaram.</>,
          ]}
        />

        <Aviso nivel="atencao" titulo="Seja honesto no tempo de trabalho">
          Anotar 20 minutos de pintura que na verdade levam uma hora não faz o preço ficar
          competitivo — faz você trabalhar de graça e não descobrir por quê.
        </Aviso>

        <H>Ler o resultado</H>
        <P>
          Além das três faixas, a tela mostra o custo aberto linha a linha, com a barra de
          participação. É ali que aparece a surpresa útil: quase sempre a mão de obra é maior que
          o filamento. A tela também traz o nível de risco, os fatores que o causaram e o ganho
          por hora.
        </P>

        <H>Preço defasado</H>
        <P>
          Ao abrir uma peça salva, o sistema recalcula com os preços de <em>hoje</em> e compara
          com o dia em que ela foi criada. É assim que aparece o aviso de que o filamento subiu e
          o seu anúncio ficou para trás. O snapshot antigo continua guardado — dá para ver o
          histórico de cálculo.
        </P>

        <H>“Produzi esta peça”</H>
        <P>
          O botão na tela da peça dá baixa no estoque de tudo que ela usa, na quantidade certa,
          de uma vez. É o que mantém a prateleira e o sistema contando a mesma história.
        </P>
      </>
    ),
  },

  {
    slug: "fotos",
    titulo: "Fotos",
    resumo: "Galeria de venda, galeria de fabricação e a capa do anúncio.",
    minutos: 2,
    Corpo: () => (
      <>
        <P>
          Cada peça tem duas galerias separadas, e a separação é proposital:
        </P>
        <Lista
          itens={[
            <><strong className="text-texto">Venda</strong> — a foto bonita, a que vai para o anúncio.</>,
            <><strong className="text-texto">Fabricação</strong> — o setup na mesa, o suporte, o erro que deu. É a sua memória técnica: daqui a seis meses, é o que te lembra de como você fez.</>,
          ]}
        />
        <H>Enviar</H>
        <Lista
          itens={[
            <>Arraste os arquivos para cima da galeria, ou toque para escolher.</>,
            <>No computador, <strong className="text-texto">Ctrl+V</strong> cola direto o print ou a foto que está na área de transferência.</>,
            <>Qualquer formato serve — inclusive o HEIC do iPhone.</>,
            <>Escolha a <strong className="text-texto">capa</strong>: é a que aparece na lista de peças e representa o anúncio.</>,
          ]}
        />
      </>
    ),
  },

  {
    slug: "mercado",
    titulo: "Mercado",
    resumo: "Câmbio, inflação e preço de filamento — de onde vêm e para que servem.",
    minutos: 3,
    Corpo: () => (
      <>
        <P>
          Uma vez por dia o sistema sai à internet e coleta dólar, índices de inflação e o preço
          de filamento praticado nas lojas e nos marketplaces. Não é enfeite: é o que permite
          responder “o filamento subiu ou fui eu que comprei mal?”.
        </P>
        <Lista
          itens={[
            <><strong className="text-texto">Câmbio e inflação</strong> — quase todo insumo de impressão é importado, direta ou indiretamente. O dólar sobe hoje, o rolo sobe daqui a algumas semanas.</>,
            <><strong className="text-texto">Preço por tipo e por loja</strong> — a mediana do que as lojas estão cobrando por PLA, PETG, ABS. Compare com o que você paga.</>,
            <><strong className="text-texto">Gráficos de 90 dias</strong> — a tendência importa mais que o número do dia.</>,
          ]}
        />
        <H>Quando um coletor falha</H>
        <P>
          Alguns sites bloqueiam robôs. Quando isso acontece, o sistema não quebra: ele mostra na
          tela qual coletor falhou e continua com os outros. O botão de coleta manual força uma
          rodada nova sem esperar o horário.
        </P>
        <Aviso nivel="info" titulo="Isto não muda seu preço sozinho">
          O mercado é informação para você decidir. Nenhum número daqui entra no cálculo da peça
          sem você mandar — o custo da sua peça é o que <em>você</em> pagou.
        </Aviso>
      </>
    ),
  },

  {
    slug: "ajustes",
    titulo: "Ajustes",
    resumo: "Impressora, energia, valor da hora, margem e quem tem acesso.",
    minutos: 4,
    Corpo: () => (
      <>
        <P>
          Estas cinco telas são a base de tudo. Enquanto elas estiverem com estimativa, o preço
          de toda peça carrega o mesmo chute. Meia hora aqui vale mais que qualquer ajuste fino
          depois.
        </P>

        <H>Impressoras</H>
        <P>
          Valor pago, vida útil em horas, manutenção por ano, horas de uso por ano e potência em
          watts. A potência costuma estar na etiqueta da fonte. É o que gera depreciação e
          energia.
        </P>

        <H>Energia</H>
        <P>
          Não use a tarifa da tabela da distribuidora — ela é sempre menor que a real. Pegue a
          última conta e informe o <strong className="text-texto">valor total</strong> e o{" "}
          <strong className="text-texto">consumo em kWh</strong>. A divisão dá o seu R$/kWh de
          verdade, com impostos e bandeira dentro.
        </P>

        <H>Mão de obra</H>
        <P>
          Um valor/hora por tipo de trabalho: modelagem vale mais que lixar. Se não souber por
          onde começar, pense em quanto você gostaria de receber num mês e divida pelas horas que
          consegue trabalhar de fato.
        </P>

        <H>Margem e taxas</H>
        <P>
          Escolha markup ou margem líquida (a diferença está em{" "}
          <Link href="/ajuda/como-o-preco-sai" className="font-semibold text-marca-700 underline dark:text-marca-400">
            Como o preço é calculado
          </Link>
          ), o percentual padrão, a taxa do canal, a da maquininha, o custo indireto mensal e as
          horas produtivas do mês.
        </P>

        <H>Quem tem acesso</H>
        <P>
          Convide por e-mail e escolha o papel. A pessoa cria a própria senha pelo link — você
          nunca vê nem define a senha de ninguém.
        </P>
      </>
    ),
  },

  {
    slug: "duvidas",
    titulo: "Dúvidas frequentes",
    resumo: "As perguntas que aparecem na primeira semana.",
    minutos: 3,
    Corpo: () => (
      <>
        <H>Mudei o preço de um material. As peças antigas mudaram?</H>
        <P>
          O cálculo delas passa a refletir o preço novo quando você abre a peça, e o sistema
          avisa que o valor mudou em relação ao dia em que ela foi criada. O histórico antigo
          continua guardado.
        </P>

        <H>Por que o preço da minha peça deu tão alto?</H>
        <P>
          Abra o custo linha a linha. Quase sempre é a mão de obra — que é justamente o custo que
          você estava pagando do próprio bolso antes de usar o sistema.
        </P>

        <H>Posso vender abaixo do mínimo?</H>
        <P>
          Pode, é o seu negócio. Só saiba que ali qualquer imprevisto — uma falha, um frete a
          mais — vira prejuízo naquela venda.
        </P>

        <H>Esqueci a senha.</H>
        <P>
          Na tela de entrada, <strong className="text-texto">Esqueci minha senha</strong>. O link
          chega por e-mail. Se não aparecer em alguns minutos, veja em spam.
        </P>

        <H>Não consigo abrir Ajustes.</H>
        <P>
          Seu papel é operador ou leitor. Peça a quem administra o ateliê para mudar em{" "}
          <Onde>Ajustes → Quem tem acesso</Onde>.
        </P>

        <H>Dá para usar no celular?</H>
        <P>
          Foi feito para isso. No celular a navegação fica na barra de baixo, ao alcance do
          polegar — porque a outra mão costuma estar segurando a peça.
        </P>

        <H>Preciso de internet?</H>
        <P>
          Sim. Os dados ficam no servidor, e é isso que permite abrir no computador o que você
          lançou no celular da bancada.
        </P>
      </>
    ),
  },
];

export const acharSecao = (slug: string) => SECOES.find((s) => s.slug === slug);
