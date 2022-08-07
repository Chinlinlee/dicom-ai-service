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

enum DICOMLevel {
    study = "STUDY",
    series = "SERIES",
    instances = "INSTANCES"
}

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

async function checkCacheSeriesExist(aiConfig: IAIModelInput) {
    let hashStudyInstanceUID = shortHash(aiConfig.studyInstanceUID);
    let cacheFilePaths: string[] = [];
    let tempExists = [];

    for (let i = 0; i< aiConfig.seriesInstanceUIDList!.length; i++) {
        let hashSeriesInstanceUID = shortHash(aiConfig.seriesInstanceUIDList![i]);
        let cacheFilePath = path.join(
            __dirname,
            "../../../temp",
            hashStudyInstanceUID,
            hashSeriesInstanceUID
        );
        let cacheFiles = await getCacheFiles(cacheFilePath);
        cacheFilePaths.push(...cacheFiles);
        let isExist = await fileExists(cacheFilePath, {
            includeDirectories: true
        });
        tempExists.push(isExist);
    }
    let everyCacheExist = tempExists.every(v => v);
    return {
        everyCacheExist: everyCacheExist,
        cacheFilePaths: cacheFilePaths
    };
}

async function checkCacheInstanceExist(aiConfig: IAIModelInput) {
    let hashStudyInstanceUID = shortHash(aiConfig.studyInstanceUID);
    let cacheFilePaths: string[] = [];
    let tempExists = [];

    for (let i = 0; i< aiConfig.sopInstanceUIDList!.length; i++) {
        let hashSeriesInstanceUID = shortHash(aiConfig.sopInstanceUIDList![i].seriesInstanceUID);
        let hashInstanceInstanceUID = shortHash(aiConfig.sopInstanceUIDList![i].sopInstanceUID);
        let cacheFilePath = path.join(
            __dirname,
            "../../../temp",
            hashStudyInstanceUID,
            hashSeriesInstanceUID,
            `${hashInstanceInstanceUID}.dcm`
        );
        cacheFilePaths.push(cacheFilePath);
        let isExist = await fileExists(cacheFilePath, {
            includeDirectories: true
        });
        tempExists.push(isExist);
    }
    let everyCacheExist = tempExists.every(v => v);
    return {
        everyCacheExist: everyCacheExist,
        cacheFilePaths: cacheFilePaths
    };
}

const dicomLevelMethodMap = {
    STUDY: async (aiConfig: IAIModelInput, useCache: boolean) => {
        if (useCache) {
            let hashStudyInstanceUID = shortHash(aiConfig.studyInstanceUID);
            let cacheFilePath = path.join(
                __dirname,
                "../../../temp",
                hashStudyInstanceUID
            );
            let cacheExist = await fileExists(cacheFilePath, {
                includeDirectories: true
            });
            if (cacheExist) {
                console.log(`The cache study DICOM files folder exists`);
                return await getCacheFiles(cacheFilePath);
            }
        }
        
        let retrieveOptions: IRetrieveOptions = {
            studyInstanceUID: aiConfig.studyInstanceUID
        };
        let dicomFilesBufferArr = await dicomWebClient.retrieveStudy(
            retrieveOptions
        );
        return await AIDicomFilesRetriever.storeMultiDICOMFilesToLocal(
            dicomFilesBufferArr
        );
    },
    SERIES: async (aiConfig: IAIModelInput, useCache: boolean) => {
        if (useCache) {
            let cacheExist = await checkCacheSeriesExist(aiConfig);
            if (cacheExist.everyCacheExist) {
                console.log(`series cache found:${cacheExist.cacheFilePaths}`);
                return cacheExist.cacheFilePaths;
            }
        }
        
        let seriesFilesStoreDest: string[] = [];
        for (let i = 0; i < aiConfig.seriesInstanceUIDList!.length; i++) {
            let seriesInstanceUID: string = aiConfig.seriesInstanceUIDList![i];
            let retrieveOptions: IRetrieveOptions = {
                studyInstanceUID: aiConfig.studyInstanceUID,
                seriesInstanceUID: seriesInstanceUID
            };
            let dicomFilesBufferArr = await dicomWebClient.retrieveSeries(
                retrieveOptions
            );
            let destList =
                await AIDicomFilesRetriever.storeMultiDICOMFilesToLocal(
                    dicomFilesBufferArr
                );
            seriesFilesStoreDest.push(...destList);
        }
        return seriesFilesStoreDest;
    },
    INSTANCES: async (aiConfig: IAIModelInput, useCache: boolean) => {
        if (useCache) {
            let cacheExist = await checkCacheInstanceExist(aiConfig);
            if (cacheExist.everyCacheExist) {
                console.log(`instances cache found:${cacheExist.cacheFilePaths}`);
                return cacheExist.cacheFilePaths;
            }
        }
        

        let instancesFilesStoreDest: string[] = [];
        for (let i = 0; i < aiConfig.sopInstanceUIDList!.length; i++) {
            let seriesInstanceUID =
                aiConfig.sopInstanceUIDList![i].seriesInstanceUID;
            let sopInstanceUID = aiConfig.sopInstanceUIDList![i].sopInstanceUID;
            let retrieveOptions: IRetrieveOptions = {
                studyInstanceUID: aiConfig.studyInstanceUID,
                seriesInstanceUID: seriesInstanceUID,
                sopInstanceUID: sopInstanceUID
            };

            let dicomFileBuffer = await dicomWebClient.retrieveInstance(
                retrieveOptions
            );
            let dest = await AIDicomFilesRetriever.storeDICOMFileToLocal(
                dicomFileBuffer
            );
            instancesFilesStoreDest.push(dest);
        }
        return instancesFilesStoreDest;
    }
};
class AIDicomFilesRetriever {
    aiConfig: IAIModelInput;
    dicomLevel: DICOMLevel;

    constructor(aiConfig: IAIModelInput) {
        this.aiConfig = aiConfig;
        this.dicomLevel = this.getDICOMLevelFromAIConfig();
    }

    private getDICOMLevelFromAIConfig() {
        if (
            this.aiConfig.seriesInstanceUIDList &&
            this.aiConfig.sopInstanceUIDList
        ) {
            if (
                this.aiConfig.seriesInstanceUIDList.length > 0 &&
                this.aiConfig.sopInstanceUIDList.length > 0
            )
                return DICOMLevel.instances;
        }
        if (this.aiConfig.seriesInstanceUIDList) {
            if (this.aiConfig.seriesInstanceUIDList.length > 0)
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
        return await dicomLevelMethodMap[this.dicomLevel](
            this.aiConfig,
            useCache
        );
    }
}

export { AIDicomFilesRetriever };
