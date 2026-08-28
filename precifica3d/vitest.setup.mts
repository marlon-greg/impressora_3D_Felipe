import { config } from "dotenv";

/**
 * Carrega o .env antes dos testes. Os que dependem de banco leem a
 * DATABASE_URL daqui; os de domínio puro ignoram tudo isto.
 */
config({ path: ".env", quiet: true });

// os testes não mandam e-mail de verdade nem em produção simulada
process.env.MAIL_PROVIDER ??= "console";
process.env.AUTH_SECRET ??= "chave-de-teste-com-mais-de-32-caracteres-para-passar-na-validacao";
