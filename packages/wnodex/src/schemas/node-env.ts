import { z } from 'zod';

import { NODE_ENV_VALUES } from '../consts/node-env.js';

export const NODE_ENVS = Object.values(NODE_ENV_VALUES);

export const NodeEnvSchema = z.enum([...NODE_ENVS]);

export const NodeEnvEnum = NodeEnvSchema.enum;

export type NodeEnv = z.infer<typeof NodeEnvSchema>;
