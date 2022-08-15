import { IAIModelInput } from "../../../models/ai-service.model";
import { dicomWebClient } from "../../../server";
import { IRetrieveOptions } from "../../../utils/DICOMweb/DICOMweb-Client";
import { parseDicom, DataSet } from "dicom-parser";
import fsP from "fs/promises";
import path from "path";
import mkdirp from "mkdirp";
import shortHash from "shorthash2";
import { fileExists } from "../../../utils/fileExist";
import glob from "glob";
import {
    DICOMLevel,
    IDicomUids
} from "../../../models/dicom.model";
import {
    inferenceCacheModel
} from "../../../models/mongodb/model/inference-cache";

function getUIDs(dicomSet: DataSet) {
    return {
        studyInstanceUID: dicomSet.string("x0020000d"),
        seriesInstanceUID: dicomSet.string("x0020000e"),
        sopInstanceUID: dicomSet.string("x00080018")
    };
}

async function getCacheFiles(dir: string): Promise<string[]> {
    return new Promise( (resolve, reject) => {
        glob("**/*.dcm", { cwd: dir }, function (err, files) {
            if (err) return reject(err);
            let filesFullFilename = files.map( file => 
                path.join(dir, file)
            );
            return resolve(filesFullFilename);
        });
    })
}

async function checkCacheExist(aiInput: IAIModelInput): Promise<string[] | null> {
    let id = shortHash(JSON.stringify(aiInput));
    let inferenceCache = await inferenceCacheModel.findOne({
        id: id
    });
    if (inferenceCache) {
        let fileList = inferenceCache.fileList.map( v=> 
            path.join(
                __dirname,
                "../../../",
                v
            )
        );

        let cacheExistsList = [];
        for (let i = 0 ; i < fileList.length ; i++) {
            let file = fileList[i];
            let isExists = await fileExists(file);
            cacheExistsList.push(isExists);
        }
        let isAllCacheExists = cacheExistsList.every( v => v );
        if (!isAllCacheExists) return null;

        console.log(`Use the cache, id: ${id}`);
        return fileList;
    }
    return null;
}

const dicomLevelMethodMap = {
    STUDY: async (dicomUids: IDicomUids) => {
        let retrieveOptions: IRetrieveOptions = dicomUids as IRetrieveOptions;
        let dicomFilesBufferArr = await dicomWebClient.retrieveStudy(
            retrieveOptions
        );
        return await AIDicomFilesRetriever.storeMultiDICOMFilesToLocal(
            dicomFilesBufferArr
        );
    },
    SERIES: async (dicomUids: IDicomUids) => {
        let retrieveOptions: IRetrieveOptions = dicomUids as IRetrieveOptions;
        let dicomFilesBufferArr = await dicomWebClient.retrieveSeries(
            retrieveOptions
        );
        let destList =
            await AIDicomFilesRetriever.storeMultiDICOMFilesToLocal(
                dicomFilesBufferArr
            );
        return destList;
    },
    INSTANCES: async (dicomUids: IDicomUids) => {
        let retrieveOptions: IRetrieveOptions = dicomUids as IRetrieveOptions;
        let dicomFileBuffer = await dicomWebClient.retrieveInstance(
            retrieveOptions
        );
        let dest = await AIDicomFilesRetriever.storeDICOMFileToLocal(
            dicomFileBuffer
        );
       
        return [dest];
    }
};
class AIDicomFilesRetriever {
    aiInput: IAIModelInput;

    constructor(aiInput: IAIModelInput) {
        this.aiInput = aiInput;
    }

    private getDICOMLevelFromAiInput(index: number) {
        if (
            this.aiInput.dicomUidsList[index].sopInstanceUID 
        ) {
            return DICOMLevel.instances;
        }

        if (this.aiInput.dicomUidsList[index].seriesInstanceUID) {
            return DICOMLevel.series;
        }

        return DICOMLevel.study;
    }

    public static async storeMultiDICOMFilesToLocal(
        bufferArr: Buffer[]
    ): Promise<string[]> {
        let filesDestList: string[] = [];
        for (let dicomFileBuffer of bufferArr) {
            let fileDest = await AIDicomFilesRetriever.storeDICOMFileToLocal(
                dicomFileBuffer
            );
            filesDestList.push(fileDest);
        }
        return filesDestList;
    }

    public static async storeDICOMFileToLocal(buffer: Buffer): Promise<string> {
        let dicomSet = parseDicom(buffer, {
            untilTag: "x00220001"
        });
        let uidObj = getUIDs(dicomSet);
        let storeFileDest = path.join(
            __dirname,
            "../../../temp",
            shortHash(uidObj.studyInstanceUID),
            shortHash(uidObj.seriesInstanceUID),
            `${shortHash(uidObj.sopInstanceUID)}.dcm`
        );
        mkdirp.sync(path.dirname(storeFileDest));
        await fsP.writeFile(storeFileDest, buffer);
        return storeFileDest;
    }

    public async retrieveDICOMFiles(useCache = false) {
        let fileList: string[] = [];

        if (useCache) {
            let cache  = await checkCacheExist(this.aiInput);
            if (cache) return cache;
        }

        for (let i = 0 ; i < this.aiInput.dicomUidsList.length; i++) {
            let uids = this.aiInput.dicomUidsList[i];
            let dicomLevel = this.getDICOMLevelFromAiInput(i);
            let retrieveFilenameList = await dicomLevelMethodMap[dicomLevel](uids as IRetrieveOptions);
            fileList.push(...retrieveFilenameList);
        }
        return fileList;
    }
}

export { AIDicomFilesRetriever, getUIDs };
