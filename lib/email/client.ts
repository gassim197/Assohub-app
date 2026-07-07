import { Resend } from "resend";

// Client Resend partagé (session 1 : clé déjà provisionnée dans .env.example).
export const resend = new Resend(process.env.RESEND_API_KEY);

// Adresse d'expédition par défaut des emails transactionnels AssoHub.
export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL ?? "AssoHub <onboarding@resend.dev>";
