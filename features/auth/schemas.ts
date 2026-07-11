import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.");

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres.");

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Informe seu nome (mínimo 2 caracteres)."),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const resetRequestSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});
