import { Response } from "express";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { envVars } from "../config/env";
import { CookieUtils } from "./cookie";
import { jwtUtils } from "./jwt";

const isProduction = envVars.NODE_ENV === "production";
const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: '/',
} as const;

//Creating access token
const getAccessToken = (payload: JwtPayload) => {
    const accessToken = jwtUtils.createToken(
        payload,
        envVars.ACCESS_TOKEN_SECRET,
        { expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN } as SignOptions
    );

    return accessToken;
}

const getRefreshToken = (payload: JwtPayload) => {
    const refreshToken = jwtUtils.createToken(
        payload,
        envVars.REFRESH_TOKEN_SECRET,
        { expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN } as SignOptions
    );
    return refreshToken;
}


const setAccessTokenCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, 'accessToken', token, {
        ...authCookieOptions,
        //1 day
        maxAge: 60 * 60 * 24 * 1000,
    });
}

const setRefreshTokenCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, 'refreshToken', token, {
        ...authCookieOptions,
        //7d
        maxAge: 60 * 60 * 24 * 1000 * 7,
    });
}

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, "better-auth.session_token", token, {
        ...authCookieOptions,
        //1 day
        maxAge: 60 * 60 * 24 * 1000,
    });
}

const clearAccessTokenCookie = (res: Response) => {
    CookieUtils.clearCookie(res, "accessToken", authCookieOptions);
}

const clearRefreshTokenCookie = (res: Response) => {
    CookieUtils.clearCookie(res, "refreshToken", authCookieOptions);
}

const clearBetterAuthSessionCookie = (res: Response) => {
    CookieUtils.clearCookie(res, "better-auth.session_token", authCookieOptions);
}



export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    setBetterAuthSessionCookie,
    clearAccessTokenCookie,
    clearRefreshTokenCookie,
    clearBetterAuthSessionCookie,
}
