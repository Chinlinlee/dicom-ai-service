interface ISopInstanceUID {
    sopInstanceUID: string;
    seriesInstanceUID: string;
}

interface IAIServiceConfig {
    aiName: string;
    studyInstanceUID: string;
    seriesInstanceUIDList?: string[];
    sopInstanceUIDList?: ISopInstanceUID[];
}


export {
    IAIServiceConfig
};