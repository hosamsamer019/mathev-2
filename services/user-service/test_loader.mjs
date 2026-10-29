// Node.js Custom Mock Loader for Isolated AL-SADEN Backend Authorization Tests
// Zero external dependencies, pure in-memory module mocking

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'express') {
    return {
      shortCircuit: true,
      url: 'file:///mock/express.js'
    };
  }
  if (specifier === 'zod') {
    return {
      shortCircuit: true,
      url: 'file:///mock/zod.js'
    };
  }
  if (specifier.includes('database')) {
    return {
      shortCircuit: true,
      url: 'file:///mock/database.js'
    };
  }
  if (specifier.includes('auth.middleware')) {
    return {
      shortCircuit: true,
      url: 'file:///mock/auth.middleware.js'
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'file:///mock/express.js' || url === 'file:///mock/auth.middleware.js') {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default {};'
    };
  }

  if (url === 'file:///mock/zod.js') {
    return {
      format: 'module',
      shortCircuit: true,
      source: `
        export class ZodError extends Error {
          constructor(errors) {
            super('ZodError');
            this.name = 'ZodError';
            this.errors = errors || [];
          }
        }

        function createStringSchema() {
          return {
            uuid: () => ({
              optional: () => createStringSchema()
            }),
            optional: () => createStringSchema()
          };
        }

        export const z = {
          ZodError,
          object: (shape) => ({
            parse: (val) => {
              if (!val || typeof val !== 'object') throw new ZodError([{ message: 'Expected object' }]);
              if (shape.records) {
                if (!Array.isArray(val.records) || val.records.length === 0) {
                  throw new ZodError([{ path: ['records'], message: 'Must contain at least 1 record' }]);
                }
                for (const r of val.records) {
                  if (!r.studentId || !r.status) throw new ZodError([{ message: 'Missing record fields' }]);
                }
              }
              if (shape.studentId && !val.studentId) {
                throw new ZodError([{ path: ['studentId'], message: 'studentId is required' }]);
              }
              return val;
            }
          }),
          string: createStringSchema,
          enum: (vals) => ({
            optional: () => ({})
          }),
          array: (elem) => ({
            min: (n) => ({})
          })
        };

        export default z;
      `
    };
  }

  if (url === 'file:///mock/database.js') {
    return {
      format: 'module',
      shortCircuit: true,
      source: `
        export const db = globalThis.prismaGlobal;
        export default { db };
      `
    };
  }

  return nextLoad(url, context);
}
