import { AICaller, AICallerMode } from "./aiCaller";
import { IAIModelInput } from "../../../models/ai-service.model";
import { AIDicomFilesRetriever } from "./dicomFileRetriever";
import path from "path";
import { IAIModelConfig } from "../../../models/ai-service.config";
import { parseStringTemplate } from "string-template-parser";
import { JSONPath } from "jsonpath-plus";
import glob from "glob";
import lodash from "lodash";
import FormData  from "form-data";
import { fileExistsSync } from "../../../utils/fileExist";
import fs from "fs";

interface IAiWorkerArgs {
    studyDir: string;
    seriesDirList: string[];
    instancesFilenameList: string[];
    studyRelativeDir: string;
    seriesRelativeDirList: string[];
    instancesRelativeFilenameList: string[];
}

class AiWorker {
    aiDicomFilesRetriever: AIDicomFilesRetriever;
    args: IAiWorkerArgs = {
        studyDir: "",
        seriesDirList: [],
        instancesFilenameList: [],
        studyRelativeDir: "",
        seriesRelativeDirList: [],
        instancesRelativeFilenameList: []
    };

    constructor(
        public aiInput: IAIModelInput,
        public aiModelConfig: IAIModelConfig
    ) {
        this.aiInput = { ...aiInput };
        this.aiDicomFilesRetriever = new AIDicomFilesRetriever(aiInput);
        this.aiModelConfig = { ...aiModelConfig };

        // Check the required field for AI caller mode
        if (this.aiModelConfig.mode === AICallerMode.api) {
            if (!this.aiModelConfig.apiUrl) {
                throw new Error(
                    `Missing \`apiUrl\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`
                );
            }
                
            this.setDefaultApiMode();
            this.checkApiConfig();
        } else if (this.aiModelConfig.mode === AICallerMode.conda) {

            if (
                !this.aiModelConfig.args &&
                !this.aiModelConfig.condaEnvName &&
                !this.aiModelConfig.entryFile
            ) {
                throw new Error(
                    `Missing \`entryFile\`, \`args\`, \`condaEnvName\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`
                );
            }

        } else if (this.aiModelConfig.mode === AICallerMode.native) {

            if (!this.aiModelConfig.args && !this.aiModelConfig.entryFile) {
                throw new Error(
                    `Missing \`entryFile\`, \`args\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`
                );
            }

        } else if (this.aiModelConfig.mode === AICallerMode.customCmd) {

            if (!this.aiModelConfig.customCmd && !this.aiModelConfig.args) {
                throw new Error(
                    `Missing \`customCmd\`, \`entryFile\`, \`args\` config in config/ai-service.config of ${this.aiModelConfig.name} ai model`
                );
            }
        }

        if (
            !Object.prototype.hasOwnProperty.call(
                this.aiModelConfig,
                "useCache"
            )
        ) {
            this.aiModelConfig.useCache = false;
        }
        console.log("useCache: " + this.aiModelConfig.useCache);
    }
    
    private setDefaultApiMode() {
        this.aiModelConfig.apiMethod = Object.prototype.hasOwnProperty.call(
            this.aiModelConfig,
            "apiMethod"
        )
            ? this.aiModelConfig.apiMethod
            : "GET";
    }

    private checkApiConfig() {
        if (this.aiModelConfig.apiMethod === "POST") {
            if (!Object.prototype.hasOwnProperty.call(this.aiModelConfig, "apiRequestBody"))
                throw new Error("Missing request body for POST AI models API");
        }
    }
    private setRelativePaths() {
        let tempFolder = path.join(__dirname, "../../../temp");

        this.args.studyRelativeDir = path.relative(tempFolder, this.args.studyDir);

        this.args.seriesRelativeDirList = this.args.seriesDirList.map( v => 
            path.relative(tempFolder, v)
        );

        this.args.instancesRelativeFilenameList = this.args.instancesFilenameList.map( v=> 
            path.relative(tempFolder, v)
        );
    }
    /**
     * 1. Download the DICOM files from PACS and separate all path of files to study, series, instance level.
     * 2. Cache the info of downloaded DICOM files into MongoDB
     */
    async downloadDicomAndGetArgs(): Promise<void> {
        

        let filesStoreDest =
            await this.aiDicomFilesRetriever.retrieveDICOMFiles(
                this.aiModelConfig.useCache
            );
        let firstPathSplit = filesStoreDest[0].split("/");
        firstPathSplit.pop();
        firstPathSplit.pop();
        this.args.studyDir = firstPathSplit.join("/");

        this.args.seriesDirList = filesStoreDest.reduce<string[]>(
            (previous, current) => {
                let dirname: string = path.dirname(current);
                if (!previous.includes(dirname)) {
                    previous.push(dirname);
                }
                return previous;
            },
            []
        );

        this.args.instancesFilenameList = filesStoreDest;
        this.setRelativePaths();

        if (this.aiModelConfig.mode === AICallerMode.api) {
            this.parseApiRequestBody();
        }
    }

    /**
     * Replace the user configure input/output template string to value of variable
     */
    private replaceStrTemplate(str: string) {
        let parseStrTemplateResult = parseStringTemplate(str);
        for (let variable of parseStrTemplateResult.variables) {
            let value = JSONPath({
                path: `$.${variable.name}`,
                json: this.args
            });
            str = str.replace(`$\{${variable.name}\}`, value);
        }
        return str;
    }

    /**
     * Replace the template variable to value in args or api url
     */
    async parseArgsOrApiUrl() {
        if (this.aiModelConfig.mode === AICallerMode.api) {
            this.aiModelConfig.apiUrl = this.replaceStrTemplate(
                this.aiModelConfig.apiUrl!
            );
        } else {
            let argStr = this.aiModelConfig.args!.join(" ");
            let parsedArgStr = this.replaceStrTemplate(argStr);
            this.aiModelConfig.args = parsedArgStr.split(" ");
        }
    }

    /**
     * 
     * Get array of replaced output path
     */
    async getOutputPaths(): Promise<string[]> {
        let pathsFromWildcard: Array<string> = [];
        this.aiModelConfig.outputPaths = await Promise.all(
            this.aiModelConfig.outputPaths.map(async (file) => {
                let parsedStr = this.replaceStrTemplate(file);
                if (parsedStr.includes("*")) {
                    let wildcardIndex = parsedStr.indexOf("*");
                    let workingDir = parsedStr.substring(0, wildcardIndex);
                    let pattern = parsedStr.substring(wildcardIndex);
                    let files = await getOutputFilesFromWildcard(
                        workingDir,
                        pattern
                    );
                    pathsFromWildcard.push(...files);
                }
                return parsedStr;
            })
        );

        this.aiModelConfig.outputPaths = lodash.dropWhile(
            this.aiModelConfig.outputPaths,
            (v) => v.includes("*")
        );
        let concatArray = [
            ...this.aiModelConfig.outputPaths,
            ...pathsFromWildcard
        ];
        this.aiModelConfig.outputPaths = concatArray;
        return this.aiModelConfig.outputPaths;
    }

    private async parseApiRequestBody() {
        if (this.aiModelConfig.apiMethod === "POST" &&
            Object.prototype.hasOwnProperty.call(this.aiModelConfig, "apiRequestBody")) {

            if (lodash.isString(this.aiModelConfig.apiRequestBody)) {
                let filenameTemplateStr = this.aiModelConfig.apiRequestBody;
                let apiRequestFilename = this.replaceStrTemplate(filenameTemplateStr);
                let formData = new FormData();
                formData.append("file", fs.createReadStream(apiRequestFilename));
                this.aiModelConfig.apiRequestBody = formData;
            }
        }
    }

    async exec() {
        await this.parseArgsOrApiUrl();
        try {
            let aiCaller = new AICaller(this.aiModelConfig, this.args);
            let execResult = await aiCaller.exec();
            console.log(`The ai model response: ${execResult}`);
            return true;
        } catch (e) {
            throw e;
        }
    }
}

/**
 *
 * @param cwd The working directory
 * @param pattern The pattern for output files, e.g. **\/\*.dcm
 * @returns The matched files with pattern in working directory
 */
async function getOutputFilesFromWildcard(
    cwd: string,
    pattern: string
): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
        if (fileExistsSync(cwd, { includeDirectories: false })) cwd = path.dirname(cwd);
        glob(
            pattern,
            {
                cwd: cwd
            },
            function (err, files) {
                if (err) return reject(err);
                let filesFullFilename = files.map((v) => path.join(cwd, v));
                return resolve(filesFullFilename);
            }
        );
    });
}



export { AiWorker, IAiWorkerArgs };
