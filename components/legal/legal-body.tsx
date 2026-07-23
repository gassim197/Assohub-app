/**
 * Rendu du corps d'une section légale (une chaîne next-intl) : les blocs
 * séparés par une ligne vide deviennent des paragraphes, un bloc dont
 * TOUTES les lignes commencent par "- " devient une liste à puces. Évite
 * d'exploser chaque paragraphe en clé JSON séparée tout en gardant fr.json
 * simple à relire et à corriger.
 */
export function LegalBody({ text }: { text: string }) {
  const blocks = text.split("\n\n");

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter((line) => line.length > 0);
        const isList = lines.length > 0 && lines.every((line) => line.startsWith("- "));

        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </>
  );
}
