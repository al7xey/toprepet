import { describe } from 'vitest';
import { createMockApi } from './mock';
import { defineScenarios } from './scenarios';

describe('мок', () => {
  defineScenarios('правила мока (их же обязан повторить сервер)', () => ({ api: createMockApi(), verifyToken: async () => 'token', resetToken: async () => 'token' }));
});
