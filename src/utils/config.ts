import * as Joi from 'joi';

export default () => ({
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  MONGO_URL: process.env.MONGO_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
});

export const validationSchema = Joi.object({
  // Basic configuration
  PORT: Joi.number().default(3000),

  // Mongo Database
  MONGO_URL: Joi.string().required(),

  // Redis Database - TODO: Include .required()
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
});
