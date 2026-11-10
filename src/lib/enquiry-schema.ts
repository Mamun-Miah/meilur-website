import { z } from "zod";
import { EVENT_SCALES, EVENT_TYPES } from "./constants";

/** Shared by the contact form (client) and the API route (server). */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "Name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a telephone number we can call.")
    .max(30, "Telephone number is too long.")
    .regex(/^\+?[\d\s()-]+$/, "Use digits, spaces and an optional +."),
  eventType: z.enum(EVENT_TYPES, { errorMap: () => ({ message: "Choose the type of event." }) }),
  eventDate: z
    .string()
    .trim()
    .max(10)
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use the date picker.")
    .refine((v) => v === "" || new Date(v).getTime() >= Date.now() - 86_400_000, "Choose a date that has not passed.")
    .optional()
    .default(""),
  venue: z.string().trim().min(2, "Tell us the venue or city.").max(160, "Keep the venue under 160 characters."),
  scale: z
    .union([z.enum(EVENT_SCALES), z.literal("")])
    .optional()
    .default(""),
  message: z
    .string()
    .trim()
    .min(20, "A few sentences about the event help us reply properly (20 characters or more).")
    .max(4000, "Keep the brief under 4,000 characters."),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export type EnquiryFieldErrors = Partial<Record<keyof EnquiryInput, string>>;

export function fieldErrors(error: z.ZodError): EnquiryFieldErrors {
  const out: EnquiryFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof EnquiryInput;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
