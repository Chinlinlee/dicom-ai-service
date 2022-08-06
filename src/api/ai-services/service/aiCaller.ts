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
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import os from "os";

enum AICallerMode {
    native = "NATIVE",
    api = "API",
    conda = "CONDA"
}

interface IAICallerOption {
    mode: AICallerMode;
    outputPaths: Array<string>; //* The path of AI result, label DICOM file, e.g. GSPS, RTSS; or image file, e.g. jpg, png
    entryFile?: string; //* Required when mode is conda or native
    args?: string[]; //* Required when mode is conda or native
    apiUrl?: string; //* Required when mode is api
    apiMethod?: "GET" | "POST"; //* Default: get
    apiRequestBody?: any;
    apiNextFunction?: (response: AxiosResponse<any, any>) => void;
    apiRequestConfig?: AxiosRequestConfig;
    condaEnvName?: string; //* Required when mode is conda
}

interface ICondaEnvs {
    envs: string[];
}

class AICallerConda {
    private envName: string;
    constructor(envName: string) {
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
    NATIVE: async (options: IAICallerOption) => {
        let pythonOptions: Options = {
            mode: "text",
            pythonOptions: ["-u"],
            scriptPath: path.dirname(options.entryFile!),
            args: options.args
        };

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
    API: async (options: IAICallerOption) => {
        let callConfig = options.apiRequestConfig ? options.apiRequestConfig : undefined;
        let response: any;
        try {
            if (options.apiMethod === "GET") {
                response = await axios.get(options.apiUrl!, callConfig);
            } else {
                response= await axios.post(options.apiUrl!, options.apiRequestBody!, callConfig);
            }
            if (Object.prototype.hasOwnProperty.call(options, "apiNextFunction"))
                options.apiNextFunction!(response.data);
            return true;
        } catch (e) {
            throw e;
        }
    },
    CONDA: async (options: IAICallerOption) => {
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
    }
} as const;

class AICaller {
    options: IAICallerOption;

    constructor(options: IAICallerOption) {
        this.options = options;
    }

    async exec() {
        try {
            let result = await aiCallerMethodLookUp[this.options.mode](
                this.options
            );
            return result;
        } catch (e) {
            throw e;
        }
    }
}

export { IAICallerOption, AICallerMode, AICaller };
