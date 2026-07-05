import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PrescriptionService } from "./prescription.service";

const createPrescription = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const user = req.user;

    const prescription = await PrescriptionService.createPrescription(user, payload);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Prescription created successfully",
        data: prescription
    });
});

const getAllPrescriptions = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const query = req.query;

    const prescriptions = await PrescriptionService.getAllPrescriptions(user, query as IQueryParams);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescriptions retrieved successfully",
        data: prescriptions.data,
        meta: prescriptions.meta
    });
});

const getPrescriptionById = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;

    const prescription = await PrescriptionService.getPrescriptionById(id as string, user);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescription retrieved successfully",
        data: prescription
    });
});

const updatePrescription = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;
    const payload = req.body;

    const prescription = await PrescriptionService.updatePrescription(id as string, user, payload);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescription updated successfully",
        data: prescription
    });
});

const deletePrescription = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;

    const result = await PrescriptionService.deletePrescription(id as string, user);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescription deleted successfully",
        data: result
    });
});

export const PrescriptionController = {
    createPrescription,
    getAllPrescriptions,
    getPrescriptionById,
    updatePrescription,
    deletePrescription
};
