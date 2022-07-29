import { NextFunction, Router } from "express";
import { aiServiceConfig } from "../../config/ai-service.config";
import postAiServiceRoute from "./controller/postAiService";
import getSupportAIService from "./controller/getSupportedAIService";

const router = Router();

/**
 * @openapi
 * /ai-service/vestibular-schwannoma:
 *  post:
 *    tags:
 *     - AI-Service
 *    description: The vestibular schwannoma AI Service that return RTSS DICOM when processing successfully
 *    requestBody:
 *      $ref: "#/components/requestBodies/vestibularSchwannomaBody"
 *    responses:
 *      200:
 *        $ref: "#/components/responses/vestibularSchwannomaRes"
 */
//router.post("/vestibular-schwannoma", postAiServiceRoute);

for (let service of aiServiceConfig.services) {
    // Check service name
    if (!/^[a-z0-9]+(-?[a-z0-9]+){0,5}$/g.test(service.name))
        throw new Error(
            `The \`name\` must be lowercase and concat with dashes and only accepts 5 dashes in string, ${service.name} is invalid`
        );
    if (service.postFunction)
    router.post("/:aiName", postAiServiceRoute, service.postFunction as NextFunction)
    else
    router.post("/:aiName", postAiServiceRoute)
}

/**
 * @openapi
 * /ai-service:
 *  get:
 *    tags:
 *     - AI-Service
 *    description: Get the supported AI model of AI service
 *    responses:
 *      200:
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  name:
 *                    type: string
 *                  params:
 *                    type: object
 *                    properties:
 *                      seriesCount:
 *                        type: number
 *                      instanceCount:
 *                        type: number
 *
 */
router.get("/", getSupportAIService);

export { router as aiServiceRouter };
