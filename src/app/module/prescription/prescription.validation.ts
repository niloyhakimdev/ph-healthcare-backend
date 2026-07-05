import z from "zod";

const createPrescriptionZodSchema = z.object({
    appointmentId: z.uuid("Appointment ID must be a valid UUID"),
    followUpDate: z.coerce.date("Follow up date must be a valid date"),
    instructions: z.string("Instructions must be a string").min(1, "Instructions are required").max(5000, "Instructions cannot exceed 5000 characters")
});

const updatePrescriptionZodSchema = z.object({
    followUpDate: z.coerce.date("Follow up date must be a valid date").optional(),
    instructions: z.string("Instructions must be a string").min(1, "Instructions are required").max(5000, "Instructions cannot exceed 5000 characters").optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update a prescription"
});

export const PrescriptionValidation = {
    createPrescriptionZodSchema,
    updatePrescriptionZodSchema
};
