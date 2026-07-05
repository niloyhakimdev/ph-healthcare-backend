import status from "http-status";
import { DoctorSchedules, Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { doctorScheduleFilterableFields, doctorScheduleIncludeConfig, doctorScheduleSearchableFields } from "./doctorSchedule.constant";
import { ICreateDoctorSchedulePayload, IUpdateDoctorSchedulePayload } from "./doctorSchedule.interface";

const getDoctorFromAuthUser = async (user: IRequestUser) => {
    if (!user?.userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized: authenticated user is missing.");
    }

    const doctorData =
        await prisma.doctor.findUnique({
            where: {
                userId: user.userId
            }
        }) ??
        (
            user.email
                ? await prisma.doctor.findUnique({
                    where: {
                        email: user.email
                    }
                })
                : null
        );

    if (!doctorData || doctorData.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found for this account.");
    }

    return doctorData;
}

const doctorScheduleDefaultInclude: Prisma.DoctorSchedulesInclude = {
    schedule: true,
    doctor: {
        include: {
            user: true,
            specialties: {
                include: {
                    specialty: true
                }
            }
        }
    }
};

const createMyDoctorSchedule = async (user : IRequestUser, payload : ICreateDoctorSchedulePayload) => {
    const doctorData = await getDoctorFromAuthUser(user);

    const doctorScheduleData = payload.scheduleIds.map((scheduleId) => ({
        doctorId : doctorData.id,
        scheduleId
    }) )

    await prisma.doctorSchedules.createMany({
        data : doctorScheduleData,
        skipDuplicates: true
    });

    const result = await prisma.doctorSchedules.findMany({
        where : {
            doctorId : doctorData.id,
            scheduleId : {
                in : payload.scheduleIds
            }
        },
        include : doctorScheduleDefaultInclude
    })


    return result;
}

const getMyDoctorSchedules = async (user: IRequestUser, query: IQueryParams) => {
    const doctorData = await getDoctorFromAuthUser(user);

    const queryBuilder = new QueryBuilder<DoctorSchedules, Prisma.DoctorSchedulesWhereInput, Prisma.DoctorSchedulesInclude>(
        prisma.doctorSchedules,
        {
            doctorId: doctorData.id,
            ...query
        },
        {
            filterableFields: doctorScheduleFilterableFields,
            searchableFields: doctorScheduleSearchableFields
        }
    );

    const doctorSchedules = await queryBuilder
        .search()
        .filter()
        .paginate()
        .include(doctorScheduleDefaultInclude)
        .sort()
        .fields()
        .dynamicInclude(doctorScheduleIncludeConfig)
        .execute();

    return doctorSchedules;
}

const getAvailableDoctorSchedules = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<DoctorSchedules, Prisma.DoctorSchedulesWhereInput, Prisma.DoctorSchedulesInclude>(
        prisma.doctorSchedules,
        query,
        {
            filterableFields: doctorScheduleFilterableFields,
            searchableFields: doctorScheduleSearchableFields
        }
    );

    const result = await queryBuilder
        .search()
        .filter()
        .where({
            isBooked: false,
            doctor: {
                isDeleted: false
            },
            schedule: {
                startDateTime: {
                    gte: new Date()
                }
            }
        })
        .paginate()
        .include(doctorScheduleDefaultInclude)
        .sort()
        .fields()
        .dynamicInclude(doctorScheduleIncludeConfig)
        .execute();

    return result;
}

const getAllDoctorSchedules = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<DoctorSchedules, Prisma.DoctorSchedulesWhereInput, Prisma.DoctorSchedulesInclude>(prisma.doctorSchedules, query, {
        filterableFields: doctorScheduleFilterableFields,
        searchableFields: doctorScheduleSearchableFields
    })

    const result = await queryBuilder
    .search()
    .filter()
    .paginate()
    .include(doctorScheduleDefaultInclude)
    .dynamicInclude(doctorScheduleIncludeConfig)
    .sort()
    .execute();

    return result;
}

const getDoctorScheduleById = async (doctorId: string, scheduleId: string) => {
    const doctorSchedule = await prisma.doctorSchedules.findUnique({
        where: {
            doctorId_scheduleId: {
                doctorId: doctorId,
                scheduleId: scheduleId
            }
        },
        include: doctorScheduleDefaultInclude
    });
    return doctorSchedule;
}


const updateMyDoctorSchedule = async (user : IRequestUser, payload: IUpdateDoctorSchedulePayload) => {
        const doctorData = await getDoctorFromAuthUser(user);

        const deleteIds = payload.scheduleIds.filter(schedule => schedule.shouldDelete).map(schedule => schedule.id);

        const createIds = payload.scheduleIds.filter(schedule => !schedule.shouldDelete).map(schedule => schedule.id);

        const result = await prisma.$transaction(async (tx) => {

            await tx.doctorSchedules.deleteMany({
                where : {
                    isBooked: false,
                    doctorId : doctorData.id,
                    scheduleId : {
                        in : deleteIds
                    }
                }
            });

            const doctorScheduleData = createIds.map((scheduleId) => ({
                doctorId : doctorData.id,
                scheduleId
            }) )

            const result = await tx.doctorSchedules.createMany({
                data : doctorScheduleData,
                skipDuplicates: true
            });

            return result;
        })

        return result;
}

const deleteMyDoctorSchedule = async (id: string, user: IRequestUser) => {
    const doctorData = await getDoctorFromAuthUser(user);

    await prisma.doctorSchedules.deleteMany({
        where: {
            isBooked: false,
            doctorId: doctorData.id,
            scheduleId: id
        }
    });
}



export const DoctorScheduleService = {
    createMyDoctorSchedule,
    getAllDoctorSchedules,
    getAvailableDoctorSchedules,
    getDoctorScheduleById,
    updateMyDoctorSchedule,
    deleteMyDoctorSchedule,
    getMyDoctorSchedules
}
