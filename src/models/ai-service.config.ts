import { IAICallerOption } from "../api/ai-services/service/aiCaller";

interface IAIModelConfig extends IAICallerOption{
    /**
     * The name use for route path
     * ^[a-z0-9]+(-?[a-z0-9]+){0,5}$, must be lowercase and concat with dashes and only accepts 5 dashes in string
     */
    name: string;
    /**
     * Use already cached DICOM files in local temporary directory
     * 1. Check the cached info in MongoDB
     * 2. If cached exists and consist, use them to inference
     * 3. Otherwise, retrieve DICOM files
     */
    useCache?: boolean;
    /**
     * Do something after AI service response is returned
     */
    postFunction?: Function;
    /**
     * Store inference DICOM label to PACS
     */
    postInference?: boolean;
}

interface IAIServiceConfig {
    services: IAIModelConfig[];
}

export {
    IAIModelConfig,
    IAIServiceConfig
};
