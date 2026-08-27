import "server-only";
import { prisma } from "@/server/db/client";
import { env } from "@/config/env";
import { avaliarSenha } from "@/core/validation/password";
import { normalizarEmail, emailValido } from "@/core/validation/email";
import { hashSenha, verificarSenha, precisaRehash } from "./hash";
import { verificarVazamento, mensagemVazamento } from "./pwned";
import { gerarToken, hashToken, expiraEm, VALIDADE } from "./tokens";
import { consumir, limpar, mensagemEspera } from "./rate-limit";
import { criarSessao, encerrarTodasSessoes } from "./session";
import { registrar, ACOES, ipAtual } from "./audit";
import {
  enviarConvite,
  enviarVerificacao,
  enviarResetSenha,
  enviarAvisoSenhaAlterada,
  modoSimulado,
} from "@/server/mail";
import type { TipoToken, Papel } from "@/generated/prisma/enums";

export interface Resultado<T = undefined> {
  ok: boolean;
  mensagem: string;
  dados?: T;
  /** erros por campo, para o formulário destacar o input certo */
  campos?: Record<string, string>;
}

const ok = <T>(mensagem: string, dados?: T): Resultado<T> => ({ ok: true, mensagem, dados });
const erro = (mensagem: string, campos?: Record<string, string>): Resultado<never> => ({
  ok: false,
  mensagem,
  campos,
});

/**
 * Mensagem propositalmente igual para e-mail existente e inexistente.
 * Se variasse, qualquer um descobriria quem tem conta aqui só testando
 * endereços — isso se chama enumeração de usuários.
 */
const RESPOSTA_NEUTRA =
  "Se este e-mail estiver cadastrado, você vai receber as instruções em instantes. Confira também a caixa de spam.";

// ── validação de senha (servidor é quem manda) ─────────────────

async function validarSenhaNova(
  senha: string,
  contexto: string[],
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const forca = avaliarSenha(senha, contexto);
  if (!forca.valida) return { ok: false, mensagem: forca.erros[0] };

  const vazamento = await verificarVazamento(senha);
  const aviso = mensagemVazamento(vazamento);
  if (aviso) return { ok: false, mensagem: aviso };

  return { ok: true };
}

// ══════════════════════════════════════════════════════════════
// CADASTRO
// ══════════════════════════════════════════════════════════════

export async function cadastrar(entrada: {
  nome: string;
  email: string;
  senha: string;
}): Promise<Resultado<{ simulado: boolean }>> {
  const ip = await ipAtual();
  const limite = await consumir("cadastro", ip);
  if (!limite.permitido) return erro(mensagemEspera(limite.esperarS));

  const nome = entrada.nome.trim();
  const email = entrada.email.trim();

  if (nome.length < 2) return erro("Informe seu nome.", { nome: "Nome muito curto." });
  if (!emailValido(email)) return erro("E-mail inválido.", { email: "Confira o endereço." });

  const senhaOk = await validarSenhaNova(entrada.senha, [nome, email]);
  if (!senhaOk.ok) return erro(senhaOk.mensagem, { senha: senhaOk.mensagem });

  const normalizado = normalizarEmail(email);
  const existente = await prisma.user.findUnique({ where: { emailNormalizado: normalizado } });

  // conta já existe: não confirmamos nem negamos, e mandamos um e-mail
  // avisando a pessoa de verdade que alguém tentou cadastrar com o endereço dela
  if (existente) {
    if (!existente.emailVerificadoEm) {
      const { bruto, hash } = gerarToken();
      await prisma.verificationToken.create({
        data: {
          userId: existente.id,
          tipo: "VERIFICAR_EMAIL",
          tokenHash: hash,
          expiraEm: expiraEm(VALIDADE.VERIFICAR_EMAIL_MS),
        },
      });
      await enviarVerificacao(existente.email, existente.nome, bruto);
    }
    await registrar(ACOES.CADASTRO, { detalhe: `tentativa em e-mail já existente` });
    return ok(RESPOSTA_NEUTRA, { simulado: modoSimulado() });
  }

  const senhaHash = await hashSenha(entrada.senha);
  const { bruto, hash } = gerarToken();
  const slugBase = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  // usuário, workspace, vínculo e token nascem juntos ou não nascem
  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        nome,
        email,
        emailNormalizado: normalizado,
        senhaHash,
        senhaAlteradaEm: new Date(),
      },
    });

    const ws = await tx.workspace.create({
      data: {
        nome: `Ateliê de ${nome.split(" ")[0]}`,
        slug: `${slugBase || "atelie"}-${u.id.slice(-6)}`,
        configuracao: { create: {} },
      },
    });

    await tx.membership.create({
      data: { userId: u.id, workspaceId: ws.id, papel: "DONO" },
    });

    await tx.verificationToken.create({
      data: {
        userId: u.id,
        tipo: "VERIFICAR_EMAIL",
        tokenHash: hash,
        expiraEm: expiraEm(VALIDADE.VERIFICAR_EMAIL_MS),
      },
    });

    return u;
  });

  await enviarVerificacao(usuario.email, usuario.nome, bruto);
  await registrar(ACOES.CADASTRO, { userId: usuario.id, detalhe: "auto-cadastro" });

  return ok(RESPOSTA_NEUTRA, { simulado: modoSimulado() });
}

// ══════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════

const MAX_FALHAS = 5;
const BLOQUEIO_MIN = 15;

export async function entrar(entrada: {
  email: string;
  senha: string;
  lembrar?: boolean;
}): Promise<Resultado<{ precisaTrocarSenha: boolean; emailNaoVerificado: boolean }>> {
  const ip = await ipAtual();
  const limite = await consumir("login", ip);
  if (!limite.permitido) {
    await registrar(ACOES.LOGIN_BLOQUEADO, { detalhe: `ip ${ip}` });
    return erro(mensagemEspera(limite.esperarS));
  }

  const normalizado = normalizarEmail(entrada.email);
  const usuario = await prisma.user.findUnique({
    where: { emailNormalizado: normalizado },
    include: { membros: true },
  });

  // Mesma mensagem para "não existe" e "senha errada": revelar a diferença
  // entregaria a lista de quem tem conta.
  const GENERICO = "E-mail ou senha incorretos.";

  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    // gasta tempo parecido com o de um hash real, pra o relógio não denunciar
    // que o e-mail não existe
    await hashSenha(entrada.senha).catch(() => undefined);
    await registrar(ACOES.LOGIN_FALHA, { detalhe: "usuário inexistente ou sem senha" });
    return erro(GENERICO);
  }

  if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    const min = Math.ceil((usuario.bloqueadoAte.getTime() - Date.now()) / 60000);
    await registrar(ACOES.LOGIN_BLOQUEADO, { userId: usuario.id });
    return erro(
      `Conta temporariamente bloqueada por tentativas seguidas. Tente de novo em ${min} minuto${min === 1 ? "" : "s"}.`,
    );
  }

  const senhaConfere = await verificarSenha(entrada.senha, usuario.senhaHash);

  if (!senhaConfere) {
    const falhas = usuario.tentativasFalhas + 1;
    await prisma.user.update({
      where: { id: usuario.id },
      data: {
        tentativasFalhas: falhas,
        bloqueadoAte:
          falhas >= MAX_FALHAS ? new Date(Date.now() + BLOQUEIO_MIN * 60_000) : null,
      },
    });
    await registrar(ACOES.LOGIN_FALHA, { userId: usuario.id, detalhe: `falha ${falhas}` });

    if (falhas >= MAX_FALHAS) {
      return erro(
        `Conta bloqueada por ${BLOQUEIO_MIN} minutos após ${MAX_FALHAS} tentativas. Se não foi você, redefina sua senha.`,
      );
    }
    return erro(GENERICO);
  }

  if (env().EXIGIR_EMAIL_VERIFICADO && !usuario.emailVerificadoEm) {
    await registrar(ACOES.LOGIN_FALHA, { userId: usuario.id, detalhe: "e-mail não verificado" });
    return {
      ok: false,
      mensagem:
        "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada — dá para reenviar o link na tela de acesso.",
      dados: { precisaTrocarSenha: false, emailNaoVerificado: true },
    };
  }

  if (usuario.membros.length === 0) {
    return erro("Sua conta não está vinculada a nenhum ateliê. Fale com quem administra o sistema.");
  }

  // hash gerado com parâmetros antigos? aproveita que temos a senha em mãos e reforça
  if (precisaRehash(usuario.senhaHash)) {
    const novo = await hashSenha(entrada.senha);
    await prisma.user.update({ where: { id: usuario.id }, data: { senhaHash: novo } });
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoAcessoEm: new Date() },
  });

  await criarSessao(usuario.id, entrada.lembrar ?? false);
  await limpar("login", ip);
  await registrar(ACOES.LOGIN_OK, { userId: usuario.id });

  return ok("Acesso liberado.", {
    precisaTrocarSenha: usuario.precisaTrocarSenha,
    emailNaoVerificado: false,
  });
}

// ══════════════════════════════════════════════════════════════
// TOKENS: consumo genérico e seguro
// ══════════════════════════════════════════════════════════════

interface TokenValido {
  id: string;
  userId: string;
  usuario: { id: string; nome: string; email: string };
  workspaceId: string | null;
  payload: string | null;
}

async function consumirToken(
  bruto: string,
  tipo: TipoToken,
): Promise<{ ok: true; token: TokenValido } | { ok: false; mensagem: string }> {
  if (!bruto || bruto.length < 20) {
    await registrar(ACOES.TOKEN_INVALIDO, { detalhe: `${tipo}: formato` });
    return { ok: false, mensagem: "Link inválido." };
  }

  const registro = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(bruto) },
    include: { user: { select: { id: true, nome: true, email: true, ativo: true } } },
  });

  if (!registro || registro.tipo !== tipo) {
    await registrar(ACOES.TOKEN_INVALIDO, { detalhe: `${tipo}: não encontrado` });
    return { ok: false, mensagem: "Link inválido ou já utilizado." };
  }
  if (registro.usadoEm) {
    await registrar(ACOES.TOKEN_INVALIDO, { userId: registro.userId, detalhe: `${tipo}: reuso` });
    return {
      ok: false,
      mensagem: "Este link já foi usado. Peça um novo se ainda precisar.",
    };
  }
  if (registro.expiraEm <= new Date()) {
    await registrar(ACOES.TOKEN_INVALIDO, { userId: registro.userId, detalhe: `${tipo}: expirado` });
    return { ok: false, mensagem: "Este link expirou. Peça um novo para continuar." };
  }
  if (!registro.user.ativo) {
    return { ok: false, mensagem: "Esta conta está desativada." };
  }

  return {
    ok: true,
    token: {
      id: registro.id,
      userId: registro.userId,
      usuario: registro.user,
      workspaceId: registro.workspaceId,
      payload: registro.payload,
    },
  };
}

/** Só confere se o link ainda serve — usado para renderizar a página antes do POST. */
export async function validarToken(bruto: string, tipo: TipoToken): Promise<Resultado<{ nome: string; email: string }>> {
  const r = await consumirToken(bruto, tipo);
  if (!r.ok) return erro(r.mensagem);
  return ok("Link válido.", { nome: r.token.usuario.nome, email: r.token.usuario.email });
}

// ══════════════════════════════════════════════════════════════
// VERIFICAR E-MAIL
// ══════════════════════════════════════════════════════════════

export async function verificarEmail(bruto: string): Promise<Resultado> {
  const r = await consumirToken(bruto, "VERIFICAR_EMAIL");
  if (!r.ok) return erro(r.mensagem);

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: r.token.id },
      data: { usadoEm: new Date() },
    }),
    prisma.user.update({
      where: { id: r.token.userId },
      data: { emailVerificadoEm: new Date() },
    }),
  ]);

  await registrar(ACOES.EMAIL_VERIFICADO, { userId: r.token.userId });
  await criarSessao(r.token.userId);

  return ok("E-mail confirmado. Sua conta está ativa.");
}

export async function reenviarVerificacao(email: string): Promise<Resultado> {
  const ip = await ipAtual();
  const limite = await consumir("reenviarEmail", ip);
  if (!limite.permitido) return erro(mensagemEspera(limite.esperarS));

  const usuario = await prisma.user.findUnique({
    where: { emailNormalizado: normalizarEmail(email) },
  });

  if (usuario && !usuario.emailVerificadoEm && usuario.ativo) {
    // invalida links antigos: só o mais recente deve funcionar
    await prisma.verificationToken.updateMany({
      where: { userId: usuario.id, tipo: "VERIFICAR_EMAIL", usadoEm: null },
      data: { usadoEm: new Date() },
    });

    const { bruto, hash } = gerarToken();
    await prisma.verificationToken.create({
      data: {
        userId: usuario.id,
        tipo: "VERIFICAR_EMAIL",
        tokenHash: hash,
        expiraEm: expiraEm(VALIDADE.VERIFICAR_EMAIL_MS),
      },
    });
    await enviarVerificacao(usuario.email, usuario.nome, bruto);
    await registrar(ACOES.EMAIL_REENVIADO, { userId: usuario.id });
  }

  return ok(RESPOSTA_NEUTRA);
}

// ══════════════════════════════════════════════════════════════
// ESQUECI A SENHA
// ══════════════════════════════════════════════════════════════

export async function solicitarReset(email: string): Promise<Resultado> {
  const ip = await ipAtual();
  const limite = await consumir("resetSenha", ip);
  if (!limite.permitido) return erro(mensagemEspera(limite.esperarS));

  const usuario = await prisma.user.findUnique({
    where: { emailNormalizado: normalizarEmail(email) },
  });

  if (usuario?.ativo) {
    await prisma.verificationToken.updateMany({
      where: { userId: usuario.id, tipo: "RESETAR_SENHA", usadoEm: null },
      data: { usadoEm: new Date() },
    });

    const { bruto, hash } = gerarToken();
    await prisma.verificationToken.create({
      data: {
        userId: usuario.id,
        tipo: "RESETAR_SENHA",
        tokenHash: hash,
        expiraEm: expiraEm(VALIDADE.RESETAR_SENHA_MS),
      },
    });
    await enviarResetSenha(usuario.email, usuario.nome, bruto);
    await registrar(ACOES.RESET_SOLICITADO, { userId: usuario.id });
  } else {
    await registrar(ACOES.RESET_SOLICITADO, { detalhe: "e-mail sem conta" });
  }

  return ok(RESPOSTA_NEUTRA);
}

/** Define a senha via token: serve tanto para reset quanto para primeiro acesso. */
export async function definirSenhaPorToken(entrada: {
  token: string;
  senha: string;
  tipo: TipoToken;
}): Promise<Resultado> {
  const ip = await ipAtual();
  const limite = await consumir("trocarSenha", ip);
  if (!limite.permitido) return erro(mensagemEspera(limite.esperarS));

  const r = await consumirToken(entrada.token, entrada.tipo);
  if (!r.ok) return erro(r.mensagem);

  const senhaOk = await validarSenhaNova(entrada.senha, [
    r.token.usuario.nome,
    r.token.usuario.email,
  ]);
  if (!senhaOk.ok) return erro(senhaOk.mensagem, { senha: senhaOk.mensagem });

  const hash = await hashSenha(entrada.senha);
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.update({
      where: { id: r.token.id },
      data: { usadoEm: agora },
    });
    await tx.user.update({
      where: { id: r.token.userId },
      data: {
        senhaHash: hash,
        senhaAlteradaEm: agora,
        precisaTrocarSenha: false,
        // quem provou ter acesso à caixa de e-mail, verificou o endereço
        emailVerificadoEm: agora,
        tentativasFalhas: 0,
        bloqueadoAte: null,
      },
    });
    // qualquer sessão anterior morre: se a conta estava comprometida, o invasor cai fora
    await tx.session.deleteMany({ where: { userId: r.token.userId } });
    // e nenhum outro link de reset continua valendo
    await tx.verificationToken.updateMany({
      where: { userId: r.token.userId, tipo: "RESETAR_SENHA", usadoEm: null },
      data: { usadoEm: agora },
    });
  });

  // vincula ao workspace do convite, se ainda não estiver
  if (r.token.workspaceId) {
    await prisma.membership
      .create({
        data: {
          userId: r.token.userId,
          workspaceId: r.token.workspaceId,
          papel: (r.token.payload as Papel) ?? "OPERADOR",
        },
      })
      .catch(() => undefined); // já vinculado
  }

  await registrar(
    entrada.tipo === "RESETAR_SENHA" ? ACOES.RESET_CONCLUIDO : ACOES.SENHA_DEFINIDA,
    { userId: r.token.userId },
  );
  await enviarAvisoSenhaAlterada(r.token.usuario.email, r.token.usuario.nome);
  await criarSessao(r.token.userId);

  return ok("Senha definida. Você já está conectado.");
}

// ══════════════════════════════════════════════════════════════
// TROCAR SENHA (usuário logado)
// ══════════════════════════════════════════════════════════════

export async function trocarSenha(entrada: {
  userId: string;
  senhaAtual: string;
  senhaNova: string;
}): Promise<Resultado> {
  const ip = await ipAtual();
  const limite = await consumir("trocarSenha", `${entrada.userId}:${ip}`);
  if (!limite.permitido) return erro(mensagemEspera(limite.esperarS));

  const usuario = await prisma.user.findUnique({ where: { id: entrada.userId } });
  if (!usuario?.senhaHash) return erro("Conta inválida.");

  if (!(await verificarSenha(entrada.senhaAtual, usuario.senhaHash))) {
    await registrar(ACOES.LOGIN_FALHA, { userId: usuario.id, detalhe: "senha atual errada" });
    return erro("A senha atual está incorreta.", { senhaAtual: "Senha incorreta." });
  }

  if (entrada.senhaAtual === entrada.senhaNova) {
    return erro("A nova senha precisa ser diferente da atual.", {
      senhaNova: "Escolha uma senha diferente da atual.",
    });
  }

  const senhaOk = await validarSenhaNova(entrada.senhaNova, [usuario.nome, usuario.email]);
  if (!senhaOk.ok) return erro(senhaOk.mensagem, { senhaNova: senhaOk.mensagem });

  const hash = await hashSenha(entrada.senhaNova);
  await prisma.user.update({
    where: { id: usuario.id },
    data: {
      senhaHash: hash,
      senhaAlteradaEm: new Date(),
      precisaTrocarSenha: false,
    },
  });

  // derruba as outras sessões e abre uma nova pra quem trocou continuar logado
  await encerrarTodasSessoes(usuario.id);
  await criarSessao(usuario.id);

  await registrar(ACOES.SENHA_ALTERADA, { userId: usuario.id });
  await enviarAvisoSenhaAlterada(usuario.email, usuario.nome);

  return ok("Senha alterada. Os outros dispositivos foram desconectados.");
}

// ══════════════════════════════════════════════════════════════
// CONVITE (admin adiciona alguém ao ateliê)
// ══════════════════════════════════════════════════════════════

export async function convidar(entrada: {
  nome: string;
  email: string;
  workspaceId: string;
  papel: Papel;
  convidadoPor: string;
}): Promise<Resultado<{ link?: string }>> {
  const email = entrada.email.trim();
  if (!emailValido(email)) return erro("E-mail inválido.", { email: "Confira o endereço." });

  const normalizado = normalizarEmail(email);

  let usuario = await prisma.user.findUnique({
    where: { emailNormalizado: normalizado },
    include: { membros: true },
  });

  if (usuario?.membros.some((m) => m.workspaceId === entrada.workspaceId)) {
    return erro("Essa pessoa já faz parte deste ateliê.");
  }

  // conta sem senha: nasce como convite e só existe de verdade quando ela aceita
  if (!usuario) {
    const criado = await prisma.user.create({
      data: {
        nome: entrada.nome.trim(),
        email,
        emailNormalizado: normalizado,
        senhaHash: null,
      },
    });
    usuario = { ...criado, membros: [] };
  }

  const { bruto, hash } = gerarToken();
  await prisma.verificationToken.create({
    data: {
      userId: usuario.id,
      tipo: "CONVITE",
      tokenHash: hash,
      expiraEm: expiraEm(VALIDADE.CONVITE_MS),
      workspaceId: entrada.workspaceId,
      payload: entrada.papel,
    },
  });

  await enviarConvite(usuario.email, usuario.nome, bruto, entrada.convidadoPor);
  await registrar(ACOES.CONVITE_ENVIADO, { detalhe: `${email} como ${entrada.papel}` });

  return ok(
    `Convite enviado para ${email}.`,
    // em modo console o link não sai por e-mail: devolvemos pra tela mostrar
    modoSimulado()
      ? { link: `${env().APP_URL}/definir-senha?token=${encodeURIComponent(bruto)}` }
      : {},
  );
}
