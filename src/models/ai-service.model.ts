import { IDicomUids } from "./dicom.model";

interface IAIModelInput {
    dicomUidsList: IDicomUids[];
}

interface IAIModelParamsInfo {
    seriesCount: number;
    instanceCount: number;
}

export {
    IAIModelInput,
    IAIModelParamsInfo
};