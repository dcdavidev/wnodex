import pretty from 'pino-pretty';

import pino from 'pino';

import { LOG_LEVELS } from './consts/log-levels.js';
import { isDevelopment } from './helpers/is-development.js';

const prettyStream = pretty({
  colorize: true,
  levelFirst: true,
  translateTime: true,
  ignore: 'pid,hostname',
  singleLine: true,
});

const baseOptions = {
  level: LOG_LEVELS.INFO,
};

export const logger = isDevelopment()
  ? pino(baseOptions, prettyStream)
  : pino(baseOptions);
