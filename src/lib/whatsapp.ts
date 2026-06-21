/**
 * Build a wa.me link from a Brazilian phone number and an optional message.
 * Accepts inputs like "(81) 99876-5432", "81998765432", "+55 81 99876 5432".
 * Returns null when the number is not usable.
 */
export function buildWhatsappLink(rawPhone: string | null | undefined, message?: string): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  // Strip leading zeros
  digits = digits.replace(/^0+/, "");
  // Add Brazil country code if absent and number looks like a national one (10 or 11 digits)
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (digits.length < 12) return null; // not enough digits
  const url = new URL(`https://wa.me/${digits}`);
  if (message && message.trim().length > 0) {
    url.searchParams.set("text", message.trim());
  }
  return url.toString();
}

export function openWhatsapp(rawPhone: string | null | undefined, message?: string): boolean {
  const url = buildWhatsappLink(rawPhone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/* ----------- Pre-built message templates ----------- */

export function msgBoasVindas(name: string, empresa: string) {
  return `Olá ${name}, aqui é da ${empresa}. Obrigado por ser nosso cliente! Posso ajudar em algo hoje?`;
}

export function msgCobranca(name: string, valor: string, vencimento: string, empresa: string) {
  return `Olá ${name}, tudo bem? Aqui é da ${empresa}. Identificamos o valor de ${valor} em aberto com vencimento em ${vencimento}. Pode confirmar a previsão de pagamento? Obrigado!`;
}

export function msgPedido(name: string, codigo: string, empresa: string) {
  return `Olá ${name}! Pedido ${codigo} da ${empresa} confirmado. Qualquer dúvida estou à disposição.`;
}