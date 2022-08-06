# DICOM-AI-Service
The DICOM AI service use DICOMweb to retrieve DICOM files with specific StudyInstanceUID, SeriesInstanceUID and SOPInstanceUID from PACS, and use the response such as DICOM file or series directory for calling specific AI model and finally get the inference output of AI model.

## Process flowchart
### AI-Service flowchart
```mermaid
flowchart LR
    user("User")
    request("POST Request")
    ai-service("AI Service API")
    pacs("PACS Server")
    ai-model(AI Model)


    user --> request
    request -- "/{aiName} with body" --> ai-service
    ai-service -- "Retrieve DICOM files via WADO-RS" --> pacs
    pacs -- DICOM files --> ai-service
    ai-service -- "Single DICOM or Folder" --> ai-model
    ai-model -- Inference Status --> ai-service
    ai-service -- Inference Output file --> user
```

## Configuration
<details>
    <summary>Mermaid visualization configuration</summary>

```mermaid
flowchart LR
    config("Config Properties")
    name("name")
    name-config("ai service name")
    mode("mode")
    mode-native("AICallerMode.native")
    mode-native-description("Execute python script<br>#quot;python main.py arg1 arg2#quot;")
    mode-conda("AICallerMode.conda")
    mode-conda-description("Execute python script via conda environment's python<br>#quot;/home/user/anaconda3/envs/envName/python main.py arg1 arg2#quot;")
    mode-api("AICallerMode.api")
    mode-api-description("1. Support API that response inference status<br>GET {baseUrl}?dcm_path=/home/user/image.dcm<br>2. Support POST single DICOM: POST {baseUrl} with request body (response ZIP or multipart)")
    entry-file("entryFile")
    entry-file-description("The path of AI model's python script<br>Please use the absolute path")
    output-paths("outputPaths")
    output-paths-description("The paths of inference results.<br>AI services will return file according to this path")
    args("args")
    args-description("The arguments for calling python script")
    api-url("apiUrl")
    api-url-description("The API url of AI model;The AI service HTTP request will call this url to get the response<br>⚠ Required when use `api` mode")
    api-method("apiMethod")
    api-method-description("The HTTP method that how to call AI model")
    api-request-body("apiRequestBody")
    api-request-body-description("The request body of POST method")
    api-next-function("apiNextFunction")
    api-next-function-description("The function after HTTP response is returned")
    api-request-config("apiRequestConfig")
    api-request-config-description("The HTTP request config")
    conda-env-name("condaEnvName")
    conda-env-name-description("The environment name of conda for calling AI model")
    post-function("postFunction")
    post-function-description("The function after AI service response is returned")
    use-cache("useCache")
    use-cache-description("use already cached DICOM files in local temporary directory")

    config --> name
    name --- name-config
    config --> mode
    mode --- mode-native
    mode-native --- mode-native-description
    mode --- mode-conda
    mode-conda --- mode-conda-description
    mode --- mode-api
    mode-api --- mode-api-description
    config --> entry-file
    entry-file --- entry-file-description
    config --> output-paths
    output-paths --- output-paths-description
    config --> args
    args --- args-description
    config --> api-url
    api-url --- api-url-description
    config --> api-request-body
    api-request-body --- api-request-body-description
    config --> api-next-function
    api-next-function --- api-next-function-description
    config --> api-request-config
    api-request-config --> api-request-config-description
    config --> conda-env-name
    conda-env-name --- conda-env-name-description
    config --> use-cache
    use-cache --- use-cache-description
    
```
</details>

property name | type | description
---------|----------|---------
 name | string | ai service name
 mode | [AICallerMode](###AICallerModel) | The mode for how to call AI model
 entryFile | string | The path of AI model's python script. Please use the absolute path
 outputPaths | string[] | The paths of inference results.<br>AI services will return file according to this path<br>Support the wildcard path. e.g. /home/user/*.dcm
 args |  string[]  | The arguments for calling python script<br>⚠ Required when use `native`, `conda` mode
 apiUrl |  string  | The API url of AI model;The AI service HTTP request will call this url to get the response<br>⚠ Required when use `api` mode
 apiMethod | "GET" \| "POST" | The HTTP method that how to call AI model<br>ℹ For `api` mode, default: "GET"
 apiRequestBody | string\|JSON | The request body of POST method<br>❗❗ Working in progress<br>ℹ For `api` mode and `POST` method<br>string: read file from this string and embed it into FormData, field name: "file"<br>JSON: POST the JSON body
 apiNextFunction | (response: [AxiosResponse](https://axios-http.com/docs/res_schema)<any, any>) => void | The function after HTTP response is returned<br>ℹ For `api` mode
 apiRequestConfig | [AxiosRequestConfig](https://axios-http.com/docs/req_config) | The HTTP request config<br>ℹ For `api` mode
 condaEnvName | string | The environment name of conda for calling AI model<br>ℹ For `conda` mode
 useCache | boolean | Use already cached DICOM files in local temporary directory
 postFunction | Function | The function after AI service response is returned

### AICallerModel
name | description 
---------|----------
 native | Execute python script: "python main.py arg1 arg2"
 conda | Execute python script via conda environment's python<br>"/home/user/anaconda3/envs/envName/python main.py arg1 arg2" 
 api | 1. Support API that response inference status: GET {baseUrl}?dcm_path=/home/user/image.dcm<br>2. Support POST single DICOM: POST {baseUrl} with request body (response ZIP or multipart)


### Variables for args
- studyDir
    - string of DICOM study path
    - usage: `${studyDir}`, when you want to input DICOM files from study level
    - example value
    ```js
        "/home/user/ai-service/dist/temp/study"
    ```

- seriesDirList
    - array string of DICOM series path
    - usage: `${seriesDirList[0]}`
    - example value
    ```js
        [
            "/home/user/ai-service/dist/temp/series1",
            "/home/user/ai-service/dist/temp/series2"
        ]
    ```

- instancesFilenameList
    - array string of DICOM instance (single DICOM file) path
    - usage: `${instancesFilenameList[0]}`
    - Use this variable when you post body that specific with "single" StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID that only retrieve single instance DICOM files
    - example value
    ```js
        [
            "/home/user/ai-service/dist/temp/series1/image1.dcm",
            "/home/user/ai-service/dist/temp/series1/image2.dcm",
        ]
    ```