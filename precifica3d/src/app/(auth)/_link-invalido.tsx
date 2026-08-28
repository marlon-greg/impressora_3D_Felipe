import { Aviso } from "@/components/ui";
import { CartaoAcesso, LinkAcesso } from "./_componentes";

/**
 * Link expirado, já usado ou adulterado. Não distinguimos qual dos três foi:
 * a diferença só serviria para alguém sondando tokens.
 */
export function LinkInvalido({
  titulo,
  motivo,
  ondeRecomecar = "/esqueci-senha",
  rotuloRecomecar = "Pedir um link novo",
}: {
  titulo: string;
  motivo: string;
  ondeRecomecar?: string;
  rotuloRecomecar?: string;
}) {
  return (
    <CartaoAcesso
      titulo={titulo}
      rodape={
        <>
          Prefere entrar? <LinkAcesso href="/entrar">Ir para a tela de acesso</LinkAcesso>
        </>
      }
    >
      <div className="space-y-5">
        <Aviso nivel="atencao">{motivo}</Aviso>
        <p className="text-sm leading-relaxed text-texto-suave">
          Links de e-mail valem uma vez só e têm prazo. Peça um novo — leva um minuto.
        </p>
        <p className="text-center text-sm">
          <LinkAcesso href={ondeRecomecar}>{rotuloRecomecar}</LinkAcesso>
        </p>
      </div>
    </CartaoAcesso>
  );
}
