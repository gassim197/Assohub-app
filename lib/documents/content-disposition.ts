/**
 * En-tête `Content-Disposition` sûr pour n'importe quel nom (RFC 6266). Une
 * valeur d'en-tête HTTP ne peut contenir que des caractères ≤ U+00FF : un
 * nom avec « — » ou un emoji ferait lever `new Response` (ByteString) et
 * renverrait une 500 — miniature cassée, téléchargement impossible.
 * `filename` porte donc un repli ASCII (accents retirés, reste remplacé par
 * `_`), `filename*` le nom exact encodé en UTF-8, prioritaire pour les
 * navigateurs actuels.
 */
export function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const asciiFallback = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "");
  // encodeURIComponent laisse passer ' ( ) * — interdits dans un ext-value.
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
