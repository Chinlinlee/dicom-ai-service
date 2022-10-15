import { Request, Response } from "express";

import { IAIModelInput } from "../../../models/ai-service.model";
import { PythonShellError } from "python-shell";
import fs from "fs";
import { AiWorker } from "../service/aiWorker";
import { aiServiceConfig } from "../../../config/ai-service.config";
import { MultipartWriter } from "../../../utils/multipartWriter";
import { parseDicom } from "dicom-parser";
import { inferenceCacheModel } from "../../../models/mongodb/model/inference-cache";
import { getUIDs } from "../service/dicomFileRetriever";
import shortHash from "shorthash2";
import path from "path";
import { dicomWebClient } from "../../../server";

export default async function (req: Request, res: Response, next: Function) {
    try {
        let aiInput = req.body as IAIModelInput;
        let aiName = req.url.substring(1);
        
        // Find the config of AI model with specified name from path parameter
        let aiConfig = aiServiceConfig.services.find(v => v.name === aiName);
        if (!aiConfig) next(new Error(`No such AI model: ${aiName}`));
        console.log(`Use AI Model: ${aiName}`);
        
        let aiWorker = new AiWorker(aiInput, aiConfig!);
        await aiWorker.downloadDicomAndGetArgs();
        // Store downloaded DICOM filename
        await storeFilesCache(aiWorker);
        let execResult = await aiWorker.exec();

        let isFile = Object.prototype.hasOwnProperty.call(aiConfig, "isFile") ? aiConfig?.isFile : true;

        if (isFile) {
            let outputPaths = await aiWorker.getOutputPaths();
            // Update the inference cache with previous stored files cache
            await storeInferenceCache(aiWorker, outputPaths);
    
            if (aiConfig?.postInference) await storeInferenceToPacs(outputPaths);
    
            if (outputPaths.length > 1) {
                console.log("response multiple files");
                await writeFilesToResponse(outputPaths, req, res);
                res.end();
            } else if (outputPaths.length === 1){
                console.log("response single file");
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream"
                });
                fs.createReadStream(outputPaths.pop()!).pipe(res);
            } else {
                return res.status(400).json({
                    isError: true,
                    message: "Missing the output files, maybe `outputPaths` configuration incorrect?"
                });
            }
        } else {
            res.send(execResult);
        }

        res.locals.aiWorker = aiWorker;
        next();
    } catch(e) {
        console.error(e);
        if (e instanceof PythonShellError) {
            return res.status(500).send(e.stack);
        }
        return res.status(500).send((e as any).message || e);
    }
}


async function writeFilesToResponse(paths: Array<string>, req: Request, res: Response) {
    let multipartWriter = new MultipartWriter(paths, req, res);
    multipartWriter.setHeaderMultipartRelatedContentType("application/octet-stream");
    multipartWriter.writeBoundary(true);
    for(let i = 0 ; i < paths.length; i++) {
        let outputPath = paths[i];
        
        
        let fileBuffer = await fs.promises.readFile(outputPath);
        multipartWriter.writeContentType("application/octet-stream");
        multipartWriter.writeContentLength(fileBuffer.length);
        multipartWriter.writeBufferData(fileBuffer);
        if (i == paths.length - 1) multipartWriter.writeFinalBoundary();
        else multipartWriter.writeBoundary(false);
    }
}

function getInferenceOutputDicomFiles(outputPaths: string[]) {
    let dicomFiles = [];
    for(let i = 0 ; i < outputPaths.length; i++) {
        let outputPath = outputPaths[i];
        let extension = path.extname(outputPath);
        if (extension === ".dcm") {
            dicomFiles.push(outputPath);
        }
    }
    return dicomFiles;
}

async function getInferenceOutputsUid(outputPaths: string[]) {
    let uidList = [];
    let dicomFiles = getInferenceOutputDicomFiles(outputPaths);
    for(let i = 0 ; i < dicomFiles.length; i++) {
        let dicomFile = dicomFiles[i];
        let dicomFileBuffer = await fs.promises.readFile(dicomFile);
        let dicomDataSet = parseDicom(dicomFileBuffer);
        let uidObj = getUIDs(dicomDataSet);
        uidList.push(uidObj);
    }
    return uidList;
}

async function storeFilesCache(aiWorker: AiWorker) {
    try {
        let id = shortHash(JSON.stringify(aiWorker.aiInput));
        console.log(`Store the downloaded file list into MongoDB, id: ${id}`);

        let relativeFileList = aiWorker.args.instancesFilenameList.map( v => {
            let filename = v.split("/temp").pop();
            return path.join("temp", filename!);
        });

        let inferenceCache = await inferenceCacheModel.findOne({
            id: id
        });

        if (!inferenceCache) {
            let inferenceCacheDoc = new inferenceCacheModel({
                id: id,
                aiInput: [...aiWorker.aiInput.dicomUidsList],
                fileList: relativeFileList,
                alreadyInference: false
            });
            await inferenceCacheDoc.save();
            return;
        }

        inferenceCache.aiInput = [...aiWorker.aiInput.dicomUidsList];
        inferenceCache.fileList = relativeFileList;
        await inferenceCache!.save();
        return;
    } catch(e) {
        throw e;
    }
}

async function storeInferenceCache(aiWorker: AiWorker, outputPaths: string[]) {
    try {
        let id = shortHash(JSON.stringify(aiWorker.aiInput));
        console.log(`Store the inference cache into MongoDB, id: ${id}`);

        let inferenceCache = await inferenceCacheModel.findOne({
            id: id
        });
        if (!inferenceCache) return;

        inferenceCache!.alreadyInference = true;
        inferenceCache!.inferences = await getInferenceOutputsUid(outputPaths);

        await inferenceCache.save();
    } catch(e) {
        throw e;
    }
}


async function storeInferenceToPacs(outputPaths: string[]) {
    try {
        let dicomFiles = getInferenceOutputDicomFiles(outputPaths);
        for (let i = 0 ; i < dicomFiles!.length; i++) {
            let dicomFile = dicomFiles[i];
            console.log(`store inference DICOM to PACS ${dicomFile}`)
            await dicomWebClient.storeInstance(dicomFile);
        }
    } catch(e) {
        throw e;
    }
}