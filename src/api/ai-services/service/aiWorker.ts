import { AICaller, AICallerMode, IAICallerOption } from "./aiCaller";
import { IAIModelInput } from "../../../models/ai-service.model";
import { AIDicomFilesRetriever } from "./dicomFileRetriever";
import path from "path";
import { IAIModelConfig } from "../../../config/ai-service.config";
import { ParsedString, parseStringTemplate } from 'string-template-parser';
import { JSONPath } from "jsonpath-plus";

interface IAiWorkerArgs {
    seriesDirList: string[];
    instancesFilenameList: string[];
}

class AiWorker {
    aiDicomFilesRetriever: AIDicomFilesRetriever;
    args: IAiWorkerArgs = {
        seriesDirList: [],
        instancesFilenameList: []
    };

    constructor(public aiInput: IAIModelInput, public aiModelConfig: IAIModelConfig) {
        this.aiInput = aiInput;
        this.aiDicomFilesRetriever = new AIDicomFilesRetriever(aiInput);
        this.aiModelConfig = aiModelConfig;

        // Check the required field for AI caller mode
        if (this.aiModelConfig.mode === AICallerMode.api) {
            if (!this.aiModelConfig.apiUrl) throw new Error(`Missing \`apiUrl\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`);
        } else if (this.aiModelConfig.mode === AICallerMode.conda) {
            if (!this.aiModelConfig.args && !this.aiModelConfig.condaEnvName && !this.aiModelConfig.entryFile)
            throw new Error(`Missing \`entryFile\`, \`args\`, \`condaEnvName\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`);
        } else if (this.aiModelConfig.mode === AICallerMode.native) {
            if (!this.aiModelConfig.args && !this.aiModelConfig.entryFile)
            throw new Error(`Missing \`entryFile\`, \`args\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`);
        }
    }

    async downloadDicomAndGetArgs(): Promise<void> {
        let filesStoreDest = await this.aiDicomFilesRetriever.retrieveDICOMFiles();
        this.args.seriesDirList = filesStoreDest.reduce<string[]>((previous, current)=> {
            let dirname: string = path.dirname(current);
            if (!previous.includes(dirname)) {
                previous.push(dirname);
            }
            return previous;
        }, []);
        this.args.instancesFilenameList = filesStoreDest;
    }

    private replaceStrTemplate(str: string) {
        let parseStrTemplateResult = parseStringTemplate(str);
        for(let variable of parseStrTemplateResult.variables) {
            let value = JSONPath({
                path: `$.${variable.name}`,
                json: this.args
            });
            str = str.replace(`$\{${variable.name}\}`, value);
        }
        return str;
    }

    async parseArgsOrApiUrl() {
        if (this.aiModelConfig.mode === AICallerMode.api) {
            this.aiModelConfig.apiUrl = this.replaceStrTemplate(this.aiModelConfig.apiUrl!);
        } else {
            let argStr = this.aiModelConfig.args!.join(" ");
            let parsedArgStr = this.replaceStrTemplate(argStr);
            this.aiModelConfig.args = parsedArgStr.split(" ");
        }
    }

    getOutputPath() {
        this.aiModelConfig.outputPath = this.replaceStrTemplate(this.aiModelConfig.outputPath);
        return this.aiModelConfig.outputPath;
    }

    async exec() {
        await this.parseArgsOrApiUrl();
        try {
            let aiCaller = new AICaller(this.aiModelConfig);
            let execResult = await aiCaller.exec();
            console.log(`The ai model response: ${execResult}`);
            return true;
        } catch(e) {
            throw e;
        }
    }

}

export {
    AiWorker
};