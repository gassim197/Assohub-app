import { z } from "zod";

import { RSVP_STATUSES } from "./constants";

/** Garde-fou serveur du RSVP d'un membre (`updateMemberRsvp`). */
export const updateMemberRsvpServerSchema = z.object({
  memberId: z.string().min(1),
  rsvpStatus: z.enum(RSVP_STATUSES),
});

/** Garde-fou serveur de la présence effective d'un membre (`updateMemberAttendance`). */
export const updateMemberAttendanceServerSchema = z.object({
  memberId: z.string().min(1),
  attended: z.boolean(),
});

/** Garde-fou serveur des actions groupées (`bulkUpdateAttendance`). */
export const bulkUpdateAttendanceServerSchema = z.object({
  updates: z
    .array(
      z.object({
        memberId: z.string().min(1),
        attended: z.boolean(),
      }),
    )
    .min(1),
});
