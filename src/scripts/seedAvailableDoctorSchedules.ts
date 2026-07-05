import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { addDays, addMinutes, setHours, setMilliseconds, setMinutes, setSeconds } from "date-fns";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed available doctor schedules.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const slotTemplates = [
  { dayOffset: 1, hour: 10, minute: 0 },
  { dayOffset: 1, hour: 10, minute: 30 },
  { dayOffset: 1, hour: 11, minute: 0 },
  { dayOffset: 2, hour: 14, minute: 0 },
  { dayOffset: 2, hour: 14, minute: 30 },
  { dayOffset: 3, hour: 16, minute: 0 },
];

const buildSlotStart = (dayOffset: number, hour: number, minute: number) => {
  const baseDate = addDays(new Date(), dayOffset);
  return setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(baseDate, hour),
        minute
      ),
      0
    ),
    0
  );
};

const seedAvailableDoctorSchedules = async () => {
  const doctors = await prisma.doctor.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 5,
    select: {
      id: true,
      name: true,
    },
  });

  if (!doctors.length) {
    throw new Error("No active doctors found. Seed doctors first.");
  }

  const schedules = [];

  for (const template of slotTemplates) {
    const startDateTime = buildSlotStart(template.dayOffset, template.hour, template.minute);
    const endDateTime = addMinutes(startDateTime, 30);

    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        startDateTime,
        endDateTime,
      },
      select: {
        id: true,
      },
    });

    if (existingSchedule) {
      schedules.push(existingSchedule);
      continue;
    }

    const schedule = await prisma.schedule.create({
      data: {
        startDateTime,
        endDateTime,
      },
      select: {
        id: true,
      },
    });

    schedules.push(schedule);
  }

  let doctorScheduleCount = 0;

  for (const doctor of doctors) {
    for (const schedule of schedules) {
      await prisma.doctorSchedules.upsert({
        where: {
          doctorId_scheduleId: {
            doctorId: doctor.id,
            scheduleId: schedule.id,
          },
        },
        update: {
          isBooked: false,
        },
        create: {
          doctorId: doctor.id,
          scheduleId: schedule.id,
          isBooked: false,
        },
      });

      doctorScheduleCount += 1;
    }
  }

  console.log(`Seeded ${schedules.length} schedule slots for ${doctors.length} doctors.`);
  console.log(`Prepared ${doctorScheduleCount} available doctor schedules for patient booking.`);
};

seedAvailableDoctorSchedules()
  .catch((error) => {
    console.error("Available doctor schedule seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
