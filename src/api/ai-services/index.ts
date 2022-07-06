import { Router } from "express";
import postVestibularSchwannoma from "./controller/postVestibularSchwannoma";
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
router.post("/vestibular-schwannoma", postVestibularSchwannoma);


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

export {
    router as aiServiceRouter
};
