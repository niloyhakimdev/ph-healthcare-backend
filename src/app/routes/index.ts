import { Router } from "express";
import { AdminRoutes } from "../module/admin/admin.route";
import { AppointmentRoutes } from "../module/appointment/appointment.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { DoctorRoutes } from "../module/doctor/doctor.route";
import { DoctorScheduleRoutes } from "../module/doctorSchedule/doctorSchedule.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { PrescriptionRoutes } from "../module/prescription/prescription.route";
import { ReviewRoutes } from "../module/review/review.route";
import { scheduleRoutes } from "../module/schedule/schedule.route";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";
import { UserRoutes } from "../module/user/user.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/specialties", SpecialtyRoutes)
router.use("/users", UserRoutes)
router.use("/doctors", DoctorRoutes)
router.use("/admins", AdminRoutes)
router.use("/schedules", scheduleRoutes)
router.use("/doctor-schedules", DoctorScheduleRoutes)
router.use("/appointments", AppointmentRoutes)
router.use("/payments", PaymentRoutes)
router.use("/reviews", ReviewRoutes)
router.use("/prescriptions", PrescriptionRoutes)


export const IndexRoutes = router;
