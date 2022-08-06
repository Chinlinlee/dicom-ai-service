import { IAICallerOption } from "../api/ai-services/service/aiCaller";

interface IAIModelConfig extends IAICallerOption{
    name: string;
    useCache?: boolean;
    postFunction?: Function;
}

interface IAIServiceConfig {
    services: IAIModelConfig[];
}

export {
    IAIModelConfig,
    IAIServiceConfig
};
