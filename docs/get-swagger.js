const swaggerJsDoc = require("swagger-jsdoc");

(async () => {
    const swaggerDefinition = {
        info: {
            // API informations (required)
            title: "DICOM-AI-Service", // Title (required)
            version: "1.0.0", // Version (required)
            description: "DICOM AI Service API" // Description (optional)
        },
        openapi: "3.0.0"
    };

    // Options for the swagger docs
    const options = {
        // Import swaggerDefinitions
        swaggerDefinition,
        // Path to the API docs
        // Note that this path is relative to the current directory from which the Node.js is ran, not the application itself.
        apis: [
            `${__dirname}/../src/api/**/*.ts`,
            `${__dirname}/swagger/parameters/*.yaml`,
            `${__dirname}/swagger/requestBody/*.yaml`,
            `${__dirname}/swagger/responses/*.yaml`
        ]
    };

    const swaggerSpec = await swaggerJsDoc(options);
    console.log(JSON.stringify(swaggerSpec, null, 4));
})();
