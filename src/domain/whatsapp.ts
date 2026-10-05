export function whatsappLink(
  phone: string,
  template: string,
  values: Record<string, string | number>,
): string | null {
  const number = phone.replace(/^\+/, "");
  if (!/^[1-9]\d{7,14}$/.test(number)) return null;
  const message = template.replace(/\{([^}]+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
