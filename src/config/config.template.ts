import session from "express-session";
import { IDICOMwebClientOptions } from "../utils/DICOMweb/DICOMweb-Client";

interface IMongoDBConfig {
    databaseName: string;
    hosts: string[];
    ports: number[];
    user: string;
    password: string;
}


interface IServerConfig {
    host: string;
    port: number;
    session: session.SessionOptions;
    [property: string]: any;
}

interface IGlobalConfig {
    mongodb: IMongoDBConfig;
    server: IServerConfig;
    dicomClient: IDICOMwebClientOptions;
}


export const config: IGlobalConfig = {
    mongodb: {
        databaseName: "",
        hosts: [],
        ports: [],
        user: "",
        password: ""
    },
    server: {
        host: "",
        port: 8081,
        session: {
            secret: "secret",
            resave: true,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000
            }
        },
        cors: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept ,Authorization, apikey, user-agent",
            "Vary": "Origin",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    },
    dicomClient: {
        url: "",
        qidoURLPrefix: "",
        wadoURLPrefix: "",
        wadoMode: "wado-rs",
        stowURLPrefix: ""
    }
};