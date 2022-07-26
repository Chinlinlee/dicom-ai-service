interface ISopInstanceUID {
    sopInstanceUID: string;
    seriesInstanceUID: string;
}

interface IAIModelConfig {
    aiName: string;
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
    condaEnvName?: string;
}

export {
    IAIModelConfig,
    IAIModelInfo
};