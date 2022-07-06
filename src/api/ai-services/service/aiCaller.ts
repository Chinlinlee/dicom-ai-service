import { PythonShell, Options } from "python-shell";
import path from "path";
import { IAIServiceConfig } from "../../../models/ai-service.model";


enum AICallerMode {
    native = "NATIVE",
    api = "API"
}

interface IAICallerOption {
    mode: AICallerMode;
    entryFile?: string;
    args?: string[];
    apiUrl?: string;
}

class AICaller {
    options: IAICallerOption;
   
    constructor(options: IAICallerOption) {
        this.options = options;
    }

    async exec() {
        let pythonOptions: Options = {
            mode: "text",
            pythonOptions: ["-u"],
            scriptPath: path.dirname(this.options.entryFile!),
            args: this.options.args
        };


        return new Promise((resolve, reject) => {
            PythonShell.run(path.basename(this.options.entryFile!), pythonOptions, (err, result) => {
                if (err) return reject(err);
                return resolve(result);
            });
        });
    }

}

export {
    IAICallerOption,
    AICallerMode,
    AICaller
}
