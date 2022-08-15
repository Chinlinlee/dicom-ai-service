interface IDicomUids {
    studyInstanceUID?: string;
    seriesInstanceUID?: string;
    sopInstanceUID?: string;
}

enum DICOMLevel {
    study = "STUDY",
    series = "SERIES",
    instances = "INSTANCES"
}


export {
    IDicomUids,
    DICOMLevel
};