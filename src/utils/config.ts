import * as Joi from 'joi';

export default () => ({
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  MONGO_URL: process.env.MONGO_URL,
});

export const validationSchema = Joi.object({
  // Basic configuration
  PORT: Joi.number().default(3000),

  // Database
  MONGO_URL: Joi.string().required(),
});
