import "express-session";

declare module "express-session" {
    interface SessionData {
        oriQuery: QueryString.ParsedQs;
        access_token: string;
    }
}