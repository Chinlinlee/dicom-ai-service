import { promises, statSync, Stats } from "fs";

export type Options = {
    /**
     * Return true if path is directory. Default: `false`
     */
    includeDirectories?: boolean;
};

type Error = {
    code: string;
};

function handleError(e: Error) {
    if (e.code === "ENOENT") {
        return false;
    } else {
        return undefined;
    }
}

function handleResult(result: Stats, options?: Options) {
    return (
        result.isFile() ||
        Boolean(options?.includeDirectories && result.isDirectory())
    );
}

export async function fileExists(
    path: string,
    options?: Options
): Promise<boolean | undefined> {
    return promises
        .stat(path)
        .then((result) => {
            return handleResult(result, options);
        })
        .catch((e) => {
            return handleError(e);
        });
}

export function fileExistsSync(
    path: string,
    options?: Options
): boolean | undefined {
    try {
        const result = statSync(path);
        return handleResult(result, options);
    } catch (e) {
        return handleError(e as Error);
    }
}
