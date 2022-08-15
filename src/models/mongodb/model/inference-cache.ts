import { Document, Schema, model, SchemaTypes } from "mongoose";
import { IDicomUids } from "../../dicom.model";

interface IInferenceCache {
    aiInput: IDicomUids[];
    fileList: string[];
    inferences: IDicomUids[];
    alreadyInference: boolean;
}

interface IInferenceCacheModel extends IInferenceCache, Document {}

const dicomUidSchema = new Schema({
    studyInstanceUID: { 
        type: SchemaTypes.String,
        default: void 0
    },
    seriesInstanceUID: {
        type: SchemaTypes.String,
        default: void 0
    },
    sopInstanceUID: {
        type: SchemaTypes.String,
        default: void 0
    }
}, {
    _id: false
});

const inferenceCacheSchema = new Schema({
    id: {
        type: SchemaTypes.String
    },
    aiInput: {
        type: [dicomUidSchema],
        default: void 0
    },
    fileList: {
        type: [SchemaTypes.String],
        default: void 0
    },
    inferences: {
        type: [dicomUidSchema],
        default: void 0
    },
    alreadyInference: {
        type: SchemaTypes.Boolean,
        default: false
    }
});


const inferenceCacheModel = model<IInferenceCacheModel>("inference_cache", inferenceCacheSchema);


export {
    inferenceCacheModel,
    IInferenceCacheModel
};
