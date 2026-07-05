import { Prisma } from "../../../generated/prisma/client"

export const doctorScheduleSearchableFields = [
    'doctor.name',
    'doctor.email',
    'scheduleId',
]

export const doctorScheduleFilterableFields = [
    'doctorId',
    'scheduleId',
    'createdAt',
    'updatedAt',
    'isBooked',
    'doctor.name',
    'doctor.email',
    'schedule.startDateTime',
    'schedule.endDateTime',
]

export const doctorScheduleIncludeConfig : Partial<Record<keyof Prisma.DoctorSchedulesInclude, Prisma.DoctorSchedulesInclude[keyof Prisma.DoctorSchedulesInclude]>> ={
    doctor: {
        include: {
            user: true,
            appointments: true,
            specialties: {
                include: {
                    specialty: true
                }
            },
        }
    },
    schedule: true

}
