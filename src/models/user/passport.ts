import passport from "passport";
import passportLocal from "passport-local";
import bcrypt from "bcrypt";
import usersModel, { IUserModel } from "../mongodb/model/users";

const LocalStrategy = passportLocal.Strategy;

export default function (passport: passport.PassportStatic) {
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (user: Express.User, done) {
        done(null, user);
    });

    passport.use(
        "local-login",
        new LocalStrategy(
            {
                usernameField: "username",
                passwordField: "password",
                session: true,
                passReqToCallback: true
            },
            async function (req, username, password, done: Function) {
                let authResult = await auth(username, password);
                if (authResult.code === 0) {
                    return done(null, false, {
                        message:
                            "Server has something wrong , please contact the administrator",
                        code: authResult.code
                    });
                }
                if (authResult.code === 2 || authResult.code === 3) {
                    return done(null, false, {
                        message: "Invalid user or password",
                        code: authResult.code
                    });
                } else if (authResult.code === 4) {
                    return done(null, false, {
                        message: "The user do not active",
                        code: authResult.code
                    });
                }
                let hitUser = {
                    user: authResult.user?.username,
                    userType: authResult.user?.usertype
                };
                return done(null, hitUser);
            }
        )
    );
}

interface IAuthResult {
    code: number;
    user: IUserModel | undefined;
}

async function auth(username: string, password: string): Promise<IAuthResult> {
    try {
        let user = await usersModel
            .findOne({
                account: username
            })
            .exec();

        if (!user) return { code: 3, user: undefined };

        if (bcrypt.compareSync(password, user.password)) {
            if (user.status === 1) {
                //Successful
                return {
                    code: 1,
                    user: user
                };
            }
            return {
                //User inactivated
                code: 4,
                user: undefined
            };
        } else {
            //Invalid password
            return {
                code: 2,
                user: undefined
            };
        }
    } catch (e) {
        console.error(e);
        return {
            code: 0,
            user: undefined
        };
    }
}
