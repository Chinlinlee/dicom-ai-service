import { AICaller, AICallerMode, IAICallerOption } from "./aiCaller";
import { IAIModelConfig } from "../../../models/ai-service.model";
import { AIDicomFilesRetriever } from "./dicomFileRetriever";
import path from "path";

//* The AI result is RTSS Dicom 
//* Destination is in t2 series directory
class VestibularSchwannomaAICaller {
    aiConfig: IAIModelConfig;
    aiDicomFilesRetriever: AIDicomFilesRetriever;

    constructor(aiConfig: IAIModelConfig) {
        this.aiConfig = aiConfig;
        this.aiDicomFilesRetriever = new AIDicomFilesRetriever(aiConfig);
    }

    async execAI() {
        try {
            let seriesFilesStoreDest = await this.aiDicomFilesRetriever.retrieveDICOMFiles();
            let seriesDirList = seriesFilesStoreDest.reduce<string[]>((previous, current)=> {
                let dirname: string = path.dirname(current);
                if (!previous.includes(dirname)) {
                    previous.push(dirname);
                }
                return previous;
            }, []);
            let aiCaller: AICaller = new AICaller({
                mode: AICallerMode.native,
                entryFile: path.join(__dirname, "../../../ai-models/SMART5/M4_20220314/M4_inference_20211220.py"),
                args: seriesDirList
            });
            
            let execResult = await aiCaller.exec();
            console.log(`The python response: ${execResult}`);
            return seriesDirList;
        } catch(e) {
            throw e;
        }
    }
}

export {
    VestibularSchwannomaAICaller
};