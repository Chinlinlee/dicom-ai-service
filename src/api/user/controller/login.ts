import { Request, Response, NextFunction } from "express";
import passport from "passport";

export default function (req: Request, res: Response, next: NextFunction) {
    passport.authenticate("local-login", function(err, user, info) {
        if (err) return next(err);
        if (!user) {
            return res.status(401).json(info);
        }
        req.logIn(user, function() {
            return res.status(200).json(user);
        });
    })(req, res, next);
}