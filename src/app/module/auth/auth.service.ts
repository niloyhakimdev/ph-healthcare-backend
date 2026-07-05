import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { tokenUtils } from "../../utils/token";
import { IChangePasswordPayload, ILoginUserPayload, IRegisterPatientPayload } from "./auth.interface";

type AuthTokenPayloadSource = {
    id: string;
    role: string;
    name: string;
    email: string;
    status: string;
    isDeleted: boolean;
    emailVerified: boolean;
}

const buildAuthTokenPayload = (user: AuthTokenPayloadSource) => ({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    status: user.status as UserStatus,
    isDeleted: user.isDeleted,
    emailVerified: user.emailVerified,
});



const registerPatient = async (payload: IRegisterPatientPayload) => {
    const { name, email, password } = payload;

    const data = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
            //default values
            // needsPasswordChange: false,
            // role: Role.PATIENT
        }
    })

    if (!data.user) {
        // throw new Error("Failed to register patient");
        throw new AppError(status.BAD_REQUEST, "Failed to register patient");
    }

    //TODO : Create Patient Profile In Transaction After Sign Up Of Patient In USer Model
    try {
        const patient = await prisma.$transaction(async (tx) => {

            const patientTx = await tx.patient.create({
                data: {
                    userId: data.user.id,
                    name: payload.name,
                    email: payload.email,
                }
            })

            return patientTx
        })

        const accessToken = tokenUtils.getAccessToken(buildAuthTokenPayload(data.user));

        const refreshToken = tokenUtils.getRefreshToken(buildAuthTokenPayload(data.user));

        return {
            ...data,
            accessToken,
            refreshToken,
            patient
        }

    } catch (error) {
        console.log("Transaction error : ", error);
        await prisma.user.delete({
            where: {
                id: data.user.id
            }
        })
        throw error;
    }

}


const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload;

    const data = await auth.api.signInEmail({
        body: {
            email,
            password,
        }
    })

    if (data.user.status === UserStatus.BLOCKED) {
        throw new AppError(status.FORBIDDEN, "User is blocked");
    }

    if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User is deleted");
    }

    const accessToken = tokenUtils.getAccessToken(buildAuthTokenPayload(data.user));

    const refreshToken = tokenUtils.getRefreshToken(buildAuthTokenPayload(data.user));

    return {
        ...data,
        accessToken,
        refreshToken,
    };

}

const getMe = async (user : IRequestUser) => {
    const isUserExists = await prisma.user.findUnique({
        where : {
            id : user.userId,
        },
        include : {
            patient : {
                include : {
                    appointments : true,
                    reviews : true,
                    prescriptions : true,
                    medicalReports : true,
                    patientHealthData : true,
                }
            },
            doctor : {
                include : {
                    specialties : true,
                    appointments : true,
                    reviews : true,
                    prescriptions : true,
                }
            },
            admin : true,
        }
    })

    if (!isUserExists) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    return isUserExists;
}

const getNewToken = async (refreshToken : string, sessionToken?: string) => {
    if (!refreshToken) {
        throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
    }

    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET)


    if(!verifiedRefreshToken.success && verifiedRefreshToken.error){
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    if (sessionToken) {
        const isSessionTokenExists = await prisma.session.findUnique({
            where : {
                token : sessionToken,
            },
            include : {
                user : true,
            }
        })

        if(!isSessionTokenExists){
            throw new AppError(status.UNAUTHORIZED, "Invalid session token");
        }
    }

    const data = verifiedRefreshToken.data as JwtPayload;
    const userId = data.userId as string | undefined;

    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    const currentUser = await prisma.user.findUnique({
        where: {
            id: userId,
        }
    });

    if (!currentUser) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (currentUser.status === UserStatus.BLOCKED || currentUser.status === UserStatus.DELETED || currentUser.isDeleted) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User is not active.");
    }

    const newAccessToken = tokenUtils.getAccessToken(buildAuthTokenPayload(currentUser));

    const newRefreshToken = tokenUtils.getRefreshToken(buildAuthTokenPayload(currentUser));

    let updatedSessionToken = sessionToken;

    if (sessionToken) {
        const {token} = await prisma.session.update({
            where : {
                token : sessionToken
            },
            data : {
                token : sessionToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
                updatedAt: new Date(),
            }
        })

        updatedSessionToken = token;
    }

    return {
        accessToken : newAccessToken,
        refreshToken : newRefreshToken,
        sessionToken : updatedSessionToken,
    }

}

const changePassword = async (payload : IChangePasswordPayload, sessionToken : string) =>{
    const session = await auth.api.getSession({
        headers : new Headers({
            Authorization : `Bearer ${sessionToken}`
        })
    })

    if(!session){
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const {currentPassword, newPassword} = payload;

    const result = await auth.api.changePassword({
        body :{
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
        },
        headers : new Headers({
            Authorization : `Bearer ${sessionToken}`
        })
    })

    if(session.user.needPasswordChange){
        await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                needPasswordChange: false,
            }
        })
    }

    const accessToken = tokenUtils.getAccessToken(buildAuthTokenPayload(session.user));

    const refreshToken = tokenUtils.getRefreshToken(buildAuthTokenPayload(session.user));
    

    return {
        ...result,
        accessToken,
        refreshToken,
    }
}

const logoutUser = async (sessionToken : string) => {
    if (!sessionToken) {
        return { success: true };
    }

    const result = await auth.api.signOut({
        headers : new Headers({
            Authorization : `Bearer ${sessionToken}`
        })
    })

    return result;
}

const verifyEmail = async (email : string, otp : string) => {

    const result = await auth.api.verifyEmailOTP({
        body:{
            email,
            otp,
        }
    })

    if(result.status && !result.user.emailVerified){
        await prisma.user.update({
            where : {
                email,
            },
            data : {
                emailVerified: true,
            }
        })
    }
}

const forgetPassword = async (email : string) => {
    const isUserExist = await prisma.user.findUnique({
        where : {
            email,
        }
    })

    if(!isUserExist){
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if(!isUserExist.emailVerified){
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if(isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED){
        throw new AppError(status.NOT_FOUND, "User not found"); 
    }

    await auth.api.requestPasswordResetEmailOTP({
        body:{
            email,
        }
    })
}

const resetPassword = async (email : string, otp : string, newPassword : string) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            email,
        }
    })

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await auth.api.resetPasswordEmailOTP({
        body:{
            email,
            otp,
            password : newPassword,
        }
    })

    if (isUserExist.needPasswordChange) {
        await prisma.user.update({
            where: {
                id: isUserExist.id,
            },
            data: {
                needPasswordChange: false,
            }
        })
    }

    await prisma.session.deleteMany({
        where:{
            userId : isUserExist.id,
        }
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleLoginSuccess = async (session : Record<string, any>) =>{
    const isPatientExists = await prisma.patient.findUnique({
        where : {
            userId : session.user.id,
        }
    })

    if(!isPatientExists){
        await prisma.patient.create({
            data : {
                userId : session.user.id,
                name : session.user.name,
                email : session.user.email,
            }
        
        })
    }

    const accessToken = tokenUtils.getAccessToken(buildAuthTokenPayload(session.user));

    const refreshToken = tokenUtils.getRefreshToken(buildAuthTokenPayload(session.user));

    return {
        accessToken,
        refreshToken,
    }
}

export const AuthService = {
    registerPatient,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    logoutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
    googleLoginSuccess,
};
