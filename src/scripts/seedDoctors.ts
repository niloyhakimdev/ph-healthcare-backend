import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Gender, PrismaClient, Role, UserStatus } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed doctors.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const specialtySeeds = [
  {
    title: "Cardiology",
    description: "Diagnosis and treatment of heart-related conditions.",
  },
  {
    title: "Dermatology",
    description: "Care for skin, hair, and nail conditions.",
  },
  {
    title: "Neurology",
    description: "Treatment of brain, spine, and nervous system disorders.",
  },
];

const doctorSeeds = [
  {
    user: {
      id: "mock-doctor-user-1",
      name: "Dr. Ayesha Rahman",
      email: "ayesha.rahman@example.com",
    },
    doctor: {
      name: "Dr. Ayesha Rahman",
      email: "ayesha.rahman@example.com",
      contactNumber: "+8801711000001",
      address: "Dhanmondi, Dhaka",
      registrationNumber: "BMDC-240001",
      experience: 8,
      gender: Gender.FEMALE,
      appointmentFee: 1200,
      qualification: "MBBS, MD (Cardiology)",
      currentWorkingPlace: "Square Hospital",
      designation: "Consultant Cardiologist",
      averageRating: 4.8,
    },
    specialties: ["Cardiology"],
  },
  {
    user: {
      id: "mock-doctor-user-2",
      name: "Dr. Tanvir Hossain",
      email: "tanvir.hossain@example.com",
    },
    doctor: {
      name: "Dr. Tanvir Hossain",
      email: "tanvir.hossain@example.com",
      contactNumber: "+8801711000002",
      address: "Uttara, Dhaka",
      registrationNumber: "BMDC-240002",
      experience: 11,
      gender: Gender.MALE,
      appointmentFee: 1500,
      qualification: "MBBS, FCPS (Neurology)",
      currentWorkingPlace: "United Hospital",
      designation: "Senior Neurologist",
      averageRating: 4.6,
    },
    specialties: ["Neurology"],
  },
  {
    user: {
      id: "mock-doctor-user-3",
      name: "Dr. Nusrat Jahan",
      email: "nusrat.jahan@example.com",
    },
    doctor: {
      name: "Dr. Nusrat Jahan",
      email: "nusrat.jahan@example.com",
      contactNumber: "+8801711000003",
      address: "Banani, Dhaka",
      registrationNumber: "BMDC-240003",
      experience: 6,
      gender: Gender.FEMALE,
      appointmentFee: 1000,
      qualification: "MBBS, DDV (Dermatology)",
      currentWorkingPlace: "Labaid Specialized Hospital",
      designation: "Dermatologist",
      averageRating: 4.7,
    },
    specialties: ["Dermatology"],
  },
  {
    user: {
      id: "mock-doctor-user-4",
      name: "Dr. Fahim Karim",
      email: "fahim.karim@example.com",
    },
    doctor: {
      name: "Dr. Fahim Karim",
      email: "fahim.karim@example.com",
      contactNumber: "+8801711000004",
      address: "Mohammadpur, Dhaka",
      registrationNumber: "BMDC-240004",
      experience: 9,
      gender: Gender.MALE,
      appointmentFee: 1400,
      qualification: "MBBS, MD (Cardiology)",
      currentWorkingPlace: "Ibn Sina Hospital",
      designation: "Cardiology Specialist",
      averageRating: 4.5,
    },
    specialties: ["Cardiology"],
  },
  {
    user: {
      id: "mock-doctor-user-5",
      name: "Dr. Samia Kabir",
      email: "samia.kabir@example.com",
    },
    doctor: {
      name: "Dr. Samia Kabir",
      email: "samia.kabir@example.com",
      contactNumber: "+8801711000005",
      address: "Bashundhara, Dhaka",
      registrationNumber: "BMDC-240005",
      experience: 7,
      gender: Gender.FEMALE,
      appointmentFee: 1150,
      qualification: "MBBS, DDV",
      currentWorkingPlace: "Evercare Hospital",
      designation: "Consultant Dermatologist",
      averageRating: 4.4,
    },
    specialties: ["Dermatology"],
  },
  {
    user: {
      id: "mock-doctor-user-6",
      name: "Dr. Mehedi Hasan",
      email: "mehedi.hasan@example.com",
    },
    doctor: {
      name: "Dr. Mehedi Hasan",
      email: "mehedi.hasan@example.com",
      contactNumber: "+8801711000006",
      address: "Shantinagar, Dhaka",
      registrationNumber: "BMDC-240006",
      experience: 13,
      gender: Gender.MALE,
      appointmentFee: 1600,
      qualification: "MBBS, FCPS (Neurology)",
      currentWorkingPlace: "Dhaka Medical College Hospital",
      designation: "Neurology Consultant",
      averageRating: 4.7,
    },
    specialties: ["Neurology"],
  },
  {
    user: {
      id: "mock-doctor-user-7",
      name: "Dr. Priyanka Saha",
      email: "priyanka.saha@example.com",
    },
    doctor: {
      name: "Dr. Priyanka Saha",
      email: "priyanka.saha@example.com",
      contactNumber: "+8801711000007",
      address: "Gulshan, Dhaka",
      registrationNumber: "BMDC-240007",
      experience: 5,
      gender: Gender.FEMALE,
      appointmentFee: 1100,
      qualification: "MBBS, CCD",
      currentWorkingPlace: "Popular Diagnostic Center",
      designation: "Junior Cardiologist",
      averageRating: 4.3,
    },
    specialties: ["Cardiology"],
  },
  {
    user: {
      id: "mock-doctor-user-8",
      name: "Dr. Rafiul Islam",
      email: "rafiul.islam@example.com",
    },
    doctor: {
      name: "Dr. Rafiul Islam",
      email: "rafiul.islam@example.com",
      contactNumber: "+8801711000008",
      address: "Tejgaon, Dhaka",
      registrationNumber: "BMDC-240008",
      experience: 10,
      gender: Gender.MALE,
      appointmentFee: 1350,
      qualification: "MBBS, DVD",
      currentWorkingPlace: "Green Life Hospital",
      designation: "Skin Specialist",
      averageRating: 4.6,
    },
    specialties: ["Dermatology"],
  },
  {
    user: {
      id: "mock-doctor-user-9",
      name: "Dr. Tania Chowdhury",
      email: "tania.chowdhury@example.com",
    },
    doctor: {
      name: "Dr. Tania Chowdhury",
      email: "tania.chowdhury@example.com",
      contactNumber: "+8801711000009",
      address: "Mirpur DOHS, Dhaka",
      registrationNumber: "BMDC-240009",
      experience: 12,
      gender: Gender.FEMALE,
      appointmentFee: 1550,
      qualification: "MBBS, MD (Neurology)",
      currentWorkingPlace: "Bangabandhu Sheikh Mujib Medical University",
      designation: "Associate Neurologist",
      averageRating: 4.8,
    },
    specialties: ["Neurology"],
  },
  {
    user: {
      id: "mock-doctor-user-10",
      name: "Dr. Arman Hossain",
      email: "arman.hossain@example.com",
    },
    doctor: {
      name: "Dr. Arman Hossain",
      email: "arman.hossain@example.com",
      contactNumber: "+8801711000010",
      address: "Khilgaon, Dhaka",
      registrationNumber: "BMDC-240010",
      experience: 4,
      gender: Gender.MALE,
      appointmentFee: 950,
      qualification: "MBBS, Training in Clinical Cardiology",
      currentWorkingPlace: "Anwer Khan Modern Hospital",
      designation: "Medical Officer",
      averageRating: 4.2,
    },
    specialties: ["Cardiology"],
  },
];

const seedDoctors = async () => {
  const specialtyMap = new Map<string, string>();

  for (const specialtySeed of specialtySeeds) {
    const specialty = await prisma.specialty.upsert({
      where: { title: specialtySeed.title },
      update: {
        description: specialtySeed.description,
        isDeleted: false,
        deletedAt: null,
      },
      create: specialtySeed,
      select: {
        id: true,
        title: true,
      },
    });

    specialtyMap.set(specialty.title, specialty.id);
  }

  for (const seed of doctorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.user.email },
      update: {
        name: seed.user.name,
        role: Role.DOCTOR,
        status: UserStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        ...seed.user,
        role: Role.DOCTOR,
        status: UserStatus.ACTIVE,
        needPasswordChange: false,
      },
      select: {
        id: true,
      },
    });

    const doctor = await prisma.doctor.upsert({
      where: { email: seed.doctor.email },
      update: {
        ...seed.doctor,
        userId: user.id,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        ...seed.doctor,
        userId: user.id,
      },
      select: {
        id: true,
        email: true,
      },
    });

    for (const specialtyTitle of seed.specialties) {
      const specialtyId = specialtyMap.get(specialtyTitle);

      if (!specialtyId) {
        throw new Error(`Missing specialty seed for ${specialtyTitle}.`);
      }

      await prisma.doctorSpecialty.upsert({
        where: {
          doctorId_specialtyId: {
            doctorId: doctor.id,
            specialtyId,
          },
        },
        update: {},
        create: {
          doctorId: doctor.id,
          specialtyId,
        },
      });
    }
  }

  console.log(`Seeded ${doctorSeeds.length} doctors successfully.`);
};

seedDoctors()
  .catch((error) => {
    console.error("Doctor seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
