import { Application } from "express";
import { exampleRouter } from "./api/example";
import { userRouter } from "./api/user";
import { aiServiceRouter } from "./api/ai-services";
import { webRouter } from "./web/index/index";

async function importPluginConfig() {
    try {
        // @ts-ignore
        let config = await import("./plugins/config"); 
        return config;
    } catch(e) {
        console.log("can not find plugin config, use empty config");
        return {};
    }
}

export default async function(app: Application) {
    let pluginsConfig = await importPluginConfig();
    for (let pluginName in pluginsConfig) {
        let plugin = (pluginsConfig as any)[pluginName];
        if (plugin.before && plugin.enable) {
            let loadedPlugin = await import(`./plugins/${pluginName}`);
            loadedPlugin.init(app);
        }
      }
    
    app.use("/example", exampleRouter);
    app.use("/user", userRouter);
    app.use("/ai-service", aiServiceRouter);

    app.use("/", webRouter);

    for (let pluginName in pluginsConfig) {
        let plugin = (pluginsConfig as any)[pluginName];
        if(!plugin.before && plugin.enable) {
            let loadedPlugin = await import(`./plugins/${pluginName}`);
            loadedPlugin.init(app);
        }
    }
}