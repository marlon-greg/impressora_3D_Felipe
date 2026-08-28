import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_SESSAO } from "@/server/auth/cookie";

/**
 * Redirecionamento otimista.
 *
 * Em Next 16 este arquivo se chama `proxy.ts` e a função exportada é `proxy`
 * — não mais `middleware`.
 *
 * Aqui só olhamos SE existe o cookie, nunca se ele é válido: validar exigiria
 * consultar o banco a cada navegação, inclusive de imagem e CSS. A checagem de
 * verdade continua sendo `exigirSessao()` dentro de cada página. Isto aqui é
 * conforto — evita a piscada de carregar uma tela protegida para só então
 * mandar embora. Um cookie forjado passa por aqui e morre na página.
 */

/** Acessíveis sem sessão. Os links de e-mail caem em três destas. */
const PUBLICAS = [
  "/entrar",
  "/cadastrar",
  "/esqueci-senha",
  "/redefinir-senha",
  "/definir-senha",
  "/verificar-email",
];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const temCookie = req.cookies.has(COOKIE_SESSAO);
  const ehPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // a raiz é só um desvio: cada um para o seu lado
  if (pathname === "/") {
    return NextResponse.redirect(new URL(temCookie ? "/painel" : "/entrar", req.url));
  }

  // já entrou e voltou para a tela de login: manda para o painel.
  // `definir-senha` e `verificar-email` ficam de fora — são links de e-mail que
  // precisam funcionar mesmo com outra conta aberta no navegador.
  if (
    temCookie &&
    (pathname === "/entrar" || pathname === "/cadastrar" || pathname === "/esqueci-senha")
  ) {
    return NextResponse.redirect(new URL("/painel", req.url));
  }

  if (!temCookie && !ehPublica) {
    const destino = new URL("/entrar", req.url);
    // guarda para onde a pessoa queria ir, para voltar depois de entrar
    if (pathname !== "/painel") destino.searchParams.set("proximo", pathname + search);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  // fora: assets, imagens otimizadas, internos do Next e o cron do mercado
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
