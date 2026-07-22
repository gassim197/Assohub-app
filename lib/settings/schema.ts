import { z } from "zod";

import { ORG_TYPES } from "@/lib/organizations/types";

export const updateOrganizationSchema = z.object({
  name: z.string().min(2),
  type: z.enum(ORG_TYPES),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(2),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Mêmes règles que l'inscription (`app/(auth)/register/page.tsx`) et la
// réinitialisation (`app/(auth)/reset-password/page.tsx`).
const newPasswordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Au moins une majuscule requise")
  .regex(/[0-9]/, "Au moins un chiffre requis");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const setPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

// Mot-clé de confirmation fixe (plutôt que l'email tapé) : simple, sans
// souci de casse/espaces, pattern standard de confirmation de suppression.
export const ACCOUNT_DELETION_CONFIRMATION_WORD = "SUPPRIMER";

export const deleteAccountSchema = z.object({
  confirmation: z.literal(ACCOUNT_DELETION_CONFIRMATION_WORD),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
