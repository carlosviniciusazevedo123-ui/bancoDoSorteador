import { vi } from 'vitest';
// Isolate all tests from the configured database and real credentials.
vi.mock('../src/Database/index.js', () => ({ default: { connection: { transaction: vi.fn() } } }));
vi.mock('../src/Config/auth.js', () => ({ default: { secret: 'automation-only-secret', expiresIn: '15d' } }));
