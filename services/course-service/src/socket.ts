import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIO(io: Server): void {
  ioInstance = io;
}

export function getIO(): Server | null {
  return ioInstance;
}

/**
 * Safe proxy for Socket.IO server instance that prevents circular import cycles
 * and gracefully falls back to no-op if invoked during standalone unit tests.
 */
export const io: any = new Proxy({} as any, {
  get(_target, prop: string | symbol) {
    if (ioInstance && prop in ioInstance) {
      const val = (ioInstance as any)[prop];
      if (typeof val === 'function') {
        return val.bind(ioInstance);
      }
      return val;
    }
    // Return chaining proxy for .to().emit() etc.
    if (prop === 'to' || prop === 'in') {
      return () => io;
    }
    if (prop === 'emit') {
      return () => true;
    }
    return undefined;
  }
});
