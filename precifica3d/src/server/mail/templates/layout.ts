/**
 * Layout base dos e-mails.
 *
 * HTML de e-mail é hostil: cliente de e-mail não roda flexbox, grid nem CSS
 * externo com confiança. Por isso aqui é tabela, estilo inline e nada de
 * imagem externa — assim chega igual no Gmail, no Outlook e no celular.
 */

export interface Botao {
  texto: string;
  url: string;
}

export interface CorpoEmail {
  titulo: string;
  saudacao?: string;
  paragrafos: string[];
  botao?: Botao;
  /** exibido em caixa cinza abaixo do botão, para quem não consegue clicar */
  urlAlternativa?: string;
  aviso?: string;
  rodapeExtra?: string;
}

const MARCA = "#0f766e";
const TEXTO = "#1f2937";
const SUAVE = "#6b7280";
const BORDA = "#e5e7eb";
const FUNDO = "#f6f7f8";

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function montarHtml(c: CorpoEmail): string {
  const paragrafos = c.paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${TEXTO}">${p}</p>`,
    )
    .join("");

  const botao = c.botao
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
         <tr><td style="border-radius:8px;background:${MARCA}">
           <a href="${escapar(c.botao.url)}"
              style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;
                     color:#ffffff;text-decoration:none;border-radius:8px">${escapar(c.botao.texto)}</a>
         </td></tr>
       </table>`
    : "";

  const alternativa = c.urlAlternativa
    ? `<p style="margin:0 0 8px;font-size:13px;color:${SUAVE}">
         Se o botão não funcionar, copie e cole este endereço no navegador:
       </p>
       <p style="margin:0 0 24px;padding:12px;background:${FUNDO};border:1px solid ${BORDA};
                 border-radius:6px;font-size:13px;line-height:1.5;color:${TEXTO};
                 word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace">
         ${escapar(c.urlAlternativa)}
       </p>`
    : "";

  const aviso = c.aviso
    ? `<div style="margin:24px 0 0;padding:14px 16px;background:#fffbeb;
                   border-left:3px solid #f59e0b;border-radius:4px">
         <p style="margin:0;font-size:13px;line-height:1.6;color:#78350f">${c.aviso}</p>
       </div>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(c.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${FUNDO};
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid ${BORDA};border-radius:12px">
        <tr><td style="padding:32px 32px 0">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.08em;
                    text-transform:uppercase;color:${MARCA}">Precifica3D</p>
          <h1 style="margin:0 0 24px;font-size:22px;line-height:1.3;font-weight:700;color:${TEXTO}">
            ${escapar(c.titulo)}
          </h1>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          ${c.saudacao ? `<p style="margin:0 0 16px;font-size:15px;color:${TEXTO}">${escapar(c.saudacao)}</p>` : ""}
          ${paragrafos}
          ${botao}
          ${alternativa}
          ${aviso}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid ${BORDA}">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${SUAVE}">
            Você recebeu esta mensagem porque existe uma conta no Precifica3D com este endereço.
            ${c.rodapeExtra ? `<br>${c.rodapeExtra}` : ""}
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:${SUAVE}">
        Precifica3D — cálculo de preço para impressão 3D
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Versão texto puro. Não é opcional: e-mail só-HTML cai muito mais em spam. */
export function montarTexto(c: CorpoEmail): string {
  const semTags = (s: string) => s.replace(/<[^>]+>/g, "");
  return [
    c.titulo.toUpperCase(),
    "=".repeat(Math.min(c.titulo.length, 60)),
    "",
    c.saudacao ?? "",
    "",
    ...c.paragrafos.map(semTags),
    "",
    c.botao ? `${c.botao.texto}:\n${c.botao.url}` : "",
    "",
    c.aviso ? `AVISO: ${semTags(c.aviso)}` : "",
    "",
    "—",
    "Precifica3D — cálculo de preço para impressão 3D",
    "Você recebeu esta mensagem porque existe uma conta com este endereço.",
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
