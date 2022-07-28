import { PythonShell, Options } from "python-shell";
import path from "path";
import childProcess from "child_process";
import axios from "axios";
import url from "url";
import fsP from "fs/promises";
import os from "os";

enum AICallerMode {
    native = "NATIVE",
    api = "API",
    conda = "CONDA"
}

interface IAICallerOption {
    mode: AICallerMode;
    entryFile?: string;
    args?: string[];
    apiUrl?: string;
    outputPath?: string; // use for API mode, to store API response to specific path
    condaEnvName?: string;
}

interface ICondaEnvs {
    envs: string[];
}

class AICallerConda {
    private envName: string;
    constructor(envName: string) {
        this.envName = envName;
    }

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
        try {
            let { data } = await axios.get(options.apiUrl!);
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
