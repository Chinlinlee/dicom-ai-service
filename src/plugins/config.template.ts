export const pluginsConfig = {
    oauth: {
        name: "oauth",
        enable: false,
        before: true,
        routers: [
            {
                path: "/ai-service/*",
                method: "post"
            }
        ],
        http: "https", // http | https
        host: "", //The oauth server hostname
        client_id: "", //The oauth client ID
        path: "", //oauth verify token path
        auth_path: "", //oauth login path
        token_path: "", //oauth-client request token path
        port: ""
    }
};