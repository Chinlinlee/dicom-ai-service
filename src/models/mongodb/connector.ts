import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { IGlobalConfig } from "../../config/config";

const basename = path.basename(module.filename);
export default function(config: IGlobalConfig) {
    const id = config.mongodb.user;
    const pwd = config.mongodb.password;
    const hosts = config.mongodb.hosts;
    const ports = config.mongodb.ports;
    const dbName = config.mongodb.databaseName;
    const collection: any = {};
    let databaseUrl = "";

    hosts.forEach((host, index) => {
        if (index == 0) {
            databaseUrl += `mongodb://${host}:${ports[0]}`;
        } else {
            databaseUrl += `,${host}:${ports[index]}`;
        }
    });
    databaseUrl += `/${dbName}`;

    console.log(databaseUrl);
    mongoose.connect(databaseUrl, {
        user: id,
        pass: pwd,
        authSource: config.mongodb.authSource || "admin"
    });

    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        console.log("we're connected!");
    });

    fs.readdirSync(__dirname + '/model')
        .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
        .forEach((file) => {
            const moduleName = file.split('.')[0];
            console.log('moduleName :: ', moduleName);
            console.log('path : ', __dirname + '/model');
            let modulePath = __dirname + '/model/' + moduleName;
            import(modulePath);
        });

    return collection;
};