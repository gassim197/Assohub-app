import { z } from "zod";

// Pas de `z.literal` : le nom exact attendu varie par organisation. La
// comparaison à la vraie valeur se fait dans l'action, contre le nom relu en
// base — jamais contre une valeur envoyée par le client.
export const deleteOrganizationSchema = z.object({
  confirmation: z.string().min(1),
});

export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
