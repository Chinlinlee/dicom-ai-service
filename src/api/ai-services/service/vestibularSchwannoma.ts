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

    async getArgs(): Promise<string[]> {
        let seriesFilesStoreDest = await this.aiDicomFilesRetriever.retrieveDICOMFiles();
        let seriesDirList = seriesFilesStoreDest.reduce<string[]>((previous, current)=> {
            let dirname: string = path.dirname(current);
            if (!previous.includes(dirname)) {
                previous.push(dirname);
            }
            return previous;
        }, []);

        return seriesDirList;
    }

    async execAI() {
        try {
            let seriesDirList = await this.getArgs();

            let aiCaller: AICaller = new AICaller({
                mode: AICallerMode.native,
                entryFile: path.join(__dirname, "../../../ai-models/SMART5/M4_20220314/commander.py"),
                args: ["--t1c-dir", seriesDirList[0], "--t2-dir", seriesDirList[1]]
            });
            
            let execResult = await aiCaller.exec();
            console.log(`The python response: ${execResult}`);
            return true;
        } catch(e) {
            throw e;
        }
    }

    async execAIUseConda() {
        try {
            let seriesDirList = await this.getArgs();

            let aiCaller: AICaller = new AICaller({
                mode: AICallerMode.conda,
                entryFile: path.join(__dirname, "../../../ai-models/SMART5/M4_20220314/commander.py"),
                args: ["--t1c-dir", seriesDirList[0], "--t2-dir", seriesDirList[1]],
                condaEnvName: "smart5"
            });
            
            let execResult = await aiCaller.exec();
            console.log(`The python response: ${execResult}`);
            return true;
        } catch(e) {
            throw e;
        }
    }

    async execAIUseAPI() {
        try {
            let seriesDirList = await this.getArgs();

            let aiCaller: AICaller = new AICaller({
                mode: AICallerMode.api,
                apiUrl: `http://127.0.0.1:8000/ai_exec?t1c_dir=${seriesDirList[0]}&t2_dir=${seriesDirList[1]}`,
                outputPath: path.join(seriesDirList[0], "RTSS.dcm")
            });

            let execResult = await aiCaller.exec();
            return true;
        } catch(e) {
            throw e;
        }
    }
}

export {
    VestibularSchwannomaAICaller
};