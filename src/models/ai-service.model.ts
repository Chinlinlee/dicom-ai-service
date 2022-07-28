interface ISopInstanceUID {
    sopInstanceUID: string;
    seriesInstanceUID: string;
}

interface IAIModelInput {
    studyInstanceUID: string;
    seriesInstanceUIDList?: string[];
    sopInstanceUIDList?: ISopInstanceUID[];
}

interface IAIModelParamsInfo {
    seriesCount: number;
    instanceCount: number;
}

interface IAIModelInfo {
    name: string;
    params: IAIModelParamsInfo;
}

export {
    IAIModelInput,
    IAIModelInfo
};