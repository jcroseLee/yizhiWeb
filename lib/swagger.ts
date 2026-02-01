import swaggerJsdoc from 'swagger-jsdoc';

export const getApiDocs = async () => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Yizhi API Documentation',
        version: '1.0.0',
        description: 'API documentation for Yizhi application',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [],
    },
    apis: ['./app/api/**/*.ts'], // Path to the API docs
  };

  const spec = swaggerJsdoc(options);
  return spec;
};
