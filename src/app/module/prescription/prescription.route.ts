import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PrescriptionController } from "./prescription.controller";
import { PrescriptionValidation } from "./prescription.validation";

const router = Router();

router.post("/", checkAuth(Role.DOCTOR), validateRequest(PrescriptionValidation.createPrescriptionZodSchema), PrescriptionController.createPrescription);
router.get("/", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), PrescriptionController.getAllPrescriptions);
router.get("/:id", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), PrescriptionController.getPrescriptionById);
router.patch("/:id", checkAuth(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), validateRequest(PrescriptionValidation.updatePrescriptionZodSchema), PrescriptionController.updatePrescription);
router.delete("/:id", checkAuth(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), PrescriptionController.deletePrescription);

export const PrescriptionRoutes = router;
