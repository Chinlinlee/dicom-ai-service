import { IDicomUids } from "./dicom.model";

interface IAIModelInput {
    dicomUidsList: IDicomUids[];
    params?: any;
}

interface IAIModelParamsInfo {
    seriesCount: number;
    instanceCount: number;
}

export {
    IAIModelInput,
    IAIModelParamsInfo
};