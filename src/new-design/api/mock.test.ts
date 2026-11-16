import { describe } from 'vitest';
import { createMockApi } from './mock';
import { defineScenarios } from './scenarios';

describe('мок', () => {
  defineScenarios('правила мока (их же обязан повторить сервер)', () => ({ api: createMockApi(), verifyToken: async () => '123456', resetToken: async () => 'token' }));
});
