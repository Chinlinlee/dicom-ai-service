/**
 * The file determines how to call the python script
 * 1. Configuration
 * 2. Enumerate the way to call python script
 *     2.1 Native: python script.py arg1
 *     2.2 Conda: /home/user/anaconda3/bin/python script.py arg1
 *     2.3 API: 
 *         2.3.1 GET http://aimodel.example.com/aiName?arg1=/home/user/series/instance/example.dcm
 *         2.3.2 POST http://aimodel.example.com/aiName with form data  (work in progress)
 *
 * @author Chinlin-Lee a5566qq2581@gmail.com
 */

import { PythonShell, Options } from "python-shell";
import path from "path";
import childProcess from "child_process";
import axios, { AxiosResponse, AxiosRequestConfig, Axios } from "axios";
import os from "os";
import { IAiWorkerArgs } from "./aiWorker";
import FormData from "form-data";
import lodash from "lodash";

enum AICallerMode {
    native = "NATIVE",
    api = "API",
    conda = "CONDA",
    customCmd = "CUSTOM_CMD"
}

export interface IApiRequestBody {
    type: "formData" | "json";
    formData?: [{
        field: string;
        value: string;
        type: "string" | "file"
    }];
    formDataObj?: FormData;
    value?: JSON;
}

interface IAICallerOption {
    mode: AICallerMode;
    /**
     * The path of AI result, label DICOM file, e.g. GSPS, RTSS; or image file, e.g. jpg, png
     */
    outputPaths: Array<string>;
    /**
     * Required when mode is conda or native
     */
    entryFile?: string;
    /**
     * Required when mode is conda or native
     */
    args?: string[];
    /**
     * Required when mode is api
     */
    apiUrl?: string;
    /**
     * The API Http method, Default: get
     */
    apiMethod?: "GET" | "POST";
    /**
     * string for reading path's file or JSON body
     */
    apiRequestBody?: IApiRequestBody;
    apiNextFunction?: (response: AxiosResponse<any, any>, aiArgs: IAiWorkerArgs) => void;
    apiRequestConfig?: AxiosRequestConfig;
    /**
     * The conda environment name <br>
     * Required when mode is conda
     */
    condaEnvName?: string;
    /**
     * 
     * Required when mode is customCmd
     */
    customCmd?: string;
    contentType?: string;
}

interface ICondaEnvs {
    envs: string[];
}

class AICallerConda {
    constructor(private envName: string) {
        this.envName = envName;
    }
    
    /**
     * Get the path of conda environment by `condaEnvName` value in configuration
     * e.g. config `condaEnaName`: hello-world
     * * In linux return "/home/user/anaconda3/envs/hello-world/bin/python"
     * * In windows return "C:/ProgramData/Anaconda3/envs/hello-world/python"
     */
    async getEnvPythonPath(): Promise<string> {
        let envName = this.envName;
        return new Promise((resolve, reject) => {
            childProcess.exec(
                "conda env list --json",
                (err, stdout, stderr) => {
                    if (err) return reject(err);
                    else if (stderr) return reject(stderr);
                    let condaEnvsJson: ICondaEnvs = JSON.parse(stdout);
                    let hitEnvPath = condaEnvsJson.envs.find(
                        (v) => path.basename(v) === envName
                    );
                    if (!hitEnvPath)
                        return reject(
                            new Error(
                                `Can not find environment name: ${envName}`
                            )
                        );
                    let pythonPath =
                        os.platform() === "win32"
                            ? path.join(hitEnvPath!, "python")
                            : path.join(hitEnvPath!, "bin", "python");
                    return resolve(pythonPath);
                }
            );
        });
    }
}

const aiCallerMethodLookUp = {
    NATIVE: async (options: IAICallerOption, aiArgs: IAiWorkerArgs) => {
        let pythonOptions: Options = {
            mode: "text",
            pythonOptions: ["-u"],
            scriptPath: path.dirname(options.entryFile!),
            args: options.args
        };
        console.log(`Run python: ${JSON.stringify(pythonOptions)}`);

        return new Promise((resolve, reject) => {
            PythonShell.run(
                path.basename(options.entryFile!),
                pythonOptions,
                (err, result) => {
                    if (err) return reject(err);
                    return resolve(result);
                }
            );
        });
    },
    API: async (options: IAICallerOption, aiArgs: IAiWorkerArgs) => {
        let callConfig = options.apiRequestConfig ? options.apiRequestConfig : undefined;
        let response: AxiosResponse<any, any>;
        console.log(`Call AI model API, method: ${options.apiMethod}, url: ${options.apiUrl}, axios config: ${JSON.stringify(callConfig)}`);
        try {
            if (options.apiMethod === "GET") {
                response = await axios.get(options.apiUrl!, callConfig);
            } else {
                if (options.apiRequestBody!.type === "formData") {
                    lodash.set(callConfig!, "headers", options.apiRequestBody!.formDataObj!.getHeaders());
                    response = await axios.post(options.apiUrl!, options.apiRequestBody!.formDataObj, callConfig);
                } else if (options.apiRequestBody!.type === "json") {
                    response = await axios.post(options.apiUrl!, options.apiRequestBody!.value, callConfig);
                }
            }
            if (Object.prototype.hasOwnProperty.call(options, "apiNextFunction"))
                options.apiNextFunction!(response!, aiArgs);
            return response!.data;
        } catch (e) {
            throw e;
        }
    },
    CONDA: async (options: IAICallerOption, aiArgs: IAiWorkerArgs) => {
        let aiCallerConda = new AICallerConda(options.condaEnvName!);

        let envPath: string = "";
        try {
            envPath = await aiCallerConda.getEnvPythonPath();
        } catch (e) {
            throw e;
        }
        
        let pythonOptions: Options = {
            mode: "text",
            pythonOptions: ["-u"],
            scriptPath: path.dirname(options.entryFile!),
            args: options.args,
            pythonPath: envPath
        };
        console.log(`Run python: ${JSON.stringify(pythonOptions)}`);

        return new Promise((resolve, reject) => {
            PythonShell.run(
                path.basename(options.entryFile!),
                pythonOptions,
                (err, result) => {
                    if (err) return reject(err);
                    return resolve(result);
                }
            );
        });
    },
    CUSTOM_CMD: async (options: IAICallerOption, aiArgs: IAiWorkerArgs) => {

        if (options.customCmd?.includes("${entryFile}")) {
            options.customCmd?.replace("${entryFile}", options.entryFile!);
        }

        return new Promise((resolve, reject) => {
            console.log(`Run custom command ${options.customCmd} ${options.args?.join(" ")}`);
            let cmdOutput = "";
            let cmdSplit = options.customCmd!.split(" ");
            let mainCommand = cmdSplit!.shift();

            let cmdSpawn = childProcess.spawn(mainCommand!, [...cmdSplit, ...options.args!]);
            
            cmdSpawn.stdout.setEncoding("utf-8");
            cmdSpawn.stdout.on("data", (data) => {
                cmdOutput += data;
            });

            cmdSpawn.stderr.setEncoding("utf-8");
            cmdSpawn.stderr.on("data", (data) => {
                cmdOutput += data;
            });

            cmdSpawn.on("close", (code) => {
                if (code != 0) return reject(cmdOutput);
                return resolve(cmdOutput);
            });
        });
    }
} as const;

class AICaller {
    options: IAICallerOption;

    constructor(options: IAICallerOption, private aiArgs: IAiWorkerArgs) {
        this.options = options;
        this.aiArgs = aiArgs;
    }

    async exec() {
        try {
            let result = await aiCallerMethodLookUp[this.options.mode](
                this.options,
                this.aiArgs
            );
            return result;
        } catch (e) {
            console.error(e);
            throw new Error("The AI caller execute AI model failure");
        }
    }
}

export { IAICallerOption, AICallerMode, AICaller };
