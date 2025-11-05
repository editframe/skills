import { spawn, type ChildProcess } from "node:child_process";
import { connect as connectSocket } from "node:net";
import superjson from 'superjson';

interface RPCRequest {
  id: number;
  method: string;
  params: any;
}

interface RPCResponse {
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface PendingRequest {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class ElectronProcess {
  private process?: ChildProcess;
  private socketPath?: string;
  private nextRequestId = 1;
  private pendingRequests = new Map<number, PendingRequest>();
  private shutdownInProgress = false;
  private xvfbProcess?: ChildProcess;

  constructor(private options: {
    requestTimeoutMs?: number;
    xvfbDisplay?: number;
  } = {}) {
    this.options = {
      requestTimeoutMs: 30000,
      xvfbDisplay: 99,
      ...options
    };
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('ElectronProcess already started');
    }

    console.log("🚀 [ELECTRONPROCESS] Starting single Electron process...");
    const startTime = Date.now();

    // Start Xvfb first
    await this.startXvfb();

    // Start Electron process
    await this.startElectronProcess();

    console.log(`✅ [ELECTRONPROCESS] Process ready in ${Date.now() - startTime}ms`);
  }

  async call(method: string, params: any = {}): Promise<any> {
    if (this.shutdownInProgress) {
      throw new Error('ElectronProcess is shutting down');
    }

    if (!this.process || !this.socketPath) {
      throw new Error('ElectronProcess not started');
    }

    const requestId = this.nextRequestId++;

    return new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} (${method}) timed out`));
      }, this.options.requestTimeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: (result: any) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          resolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        },
        timeout
      });

      this.sendRequest(requestId, method, params);
    });
  }

  async shutdown(): Promise<void> {
    if (this.shutdownInProgress) return;

    console.log("🔄 [ELECTRONPROCESS] Shutting down...");
    this.shutdownInProgress = true;

    // Cancel pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('ElectronProcess shutdown'));
    }
    this.pendingRequests.clear();

    // Shutdown Electron process
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              console.log("🔄 [ELECTRONPROCESS] Force killing Electron process...");
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 3000);

          this.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (error) {
        console.warn("⚠️ [ELECTRONPROCESS] Error shutting down Electron:", error);
      }
      this.process = undefined;
    }

    // Shutdown Xvfb
    if (this.xvfbProcess) {
      try {
        this.xvfbProcess.kill('SIGTERM');
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (this.xvfbProcess) {
              this.xvfbProcess.kill('SIGKILL');
            }
            resolve();
          }, 2000);

          this.xvfbProcess!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (error) {
        console.warn("⚠️ [ELECTRONPROCESS] Error shutting down Xvfb:", error);
      }
      this.xvfbProcess = undefined;
    }

    console.log("✅ [ELECTRONPROCESS] Shutdown complete");
  }

  private async startXvfb(): Promise<void> {
    const display = `:${this.options.xvfbDisplay}`;

    console.log(`[ELECTRONPROCESS] Starting Xvfb on display ${display}...`);

    this.xvfbProcess = spawn('Xvfb', [
      display,
      '-screen', '0', '1920x1080x24',
      '-nolisten', 'tcp',
      '-dpi', '96'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for Xvfb to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Xvfb startup timeout'));
      }, 5000);

      this.xvfbProcess!.on('spawn', () => {
        clearTimeout(timeout);
        // Give Xvfb a moment to fully initialize
        setTimeout(resolve, 500);
      });

      this.xvfbProcess!.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    console.log("✅ [ELECTRONPROCESS] Xvfb ready");
  }

  private async startElectronProcess(): Promise<void> {
    const display = `:${this.options.xvfbDisplay}`;

    console.log("[ELECTRONPROCESS] Starting Electron process...");

    const electronProcess = this.process = spawn('node', [
      '/app/lib/electron-exec/executeInElectron.js'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DISPLAY: display,
        ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        NODE_ENV: 'test'
      }
    });

    // Wait for the RPC socket to be ready
    await new Promise<void>((resolve, reject) => {
      let buffer = '';
      const timeout = setTimeout(() => {
        reject(new Error('Electron process startup timeout'));
      }, 15000);

      let ready = false;
      const onStdout = (data: Buffer) => {
        process.stdout.write(data);
        if (ready) return;
        buffer += data.toString();
        const lines = buffer.split('\n');

        for (const line of lines) {
          if (line.includes('ELECTRON_RPC_READY:')) {
            this.socketPath = line.split('ELECTRON_RPC_READY:')[1]?.trim();
            if (this.socketPath) {
              clearTimeout(timeout);
              electronProcess.stdout.off('data', onStdout);
              ready = true;
              this.setupResponseHandler();
              resolve();
              return;
            }
          }
        }
      };

      electronProcess.stdout.on('data', onStdout);
      electronProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      electronProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      electronProcess.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Electron process exited with code ${code}`));
      });
    });

    console.log("✅ [ELECTRONPROCESS] Electron process ready");
  }

  private setupResponseHandler(): void {
    if (!this.process?.stdout) return;

    let responseBuffer = '';

    this.process.stdout.on('data', (data: Buffer) => {
      responseBuffer += data.toString();

      let newlineIndex;
      while ((newlineIndex = responseBuffer.indexOf('\n')) !== -1) {
        const line = responseBuffer.slice(0, newlineIndex).trim();
        responseBuffer = responseBuffer.slice(newlineIndex + 1);

        if (!line || line.includes('ELECTRON_RPC_READY:')) continue;

        try {
          const response: RPCResponse = JSON.parse(line);
          const pending = this.pendingRequests.get(response.id);

          if (pending) {
            if (response.error) {
              const error = new Error(response.error.message);
              (error as any).code = response.error.code;
              pending.reject(error);
            } else {
              const result = this.shouldDeserialize(response.result)
                ? superjson.deserialize(response.result)
                : response.result;
              pending.resolve(result);
            }
          }
        } catch (error) {
          console.warn("Failed to parse response:", line.substring(0, 100));
        }
      }
    });
  }

  private async sendRequest(requestId: number, method: string, params: any): Promise<void> {
    if (!this.socketPath) {
      throw new Error('Socket path not available');
    }

    const socket = connectSocket(this.socketPath);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const serializedParams = this.shouldSerialize(params) ? superjson.serialize(params) : params;
    const request: RPCRequest = {
      id: requestId,
      method,
      params: serializedParams
    };

    socket.write(`${JSON.stringify(request)}\n`);
    socket.end();
  }

  private shouldSerialize(value: any): boolean {
    if (value === null || value === undefined ||
      typeof value === 'string' || typeof value === 'number' ||
      typeof value === 'boolean') {
      return false;
    }
    return true;
  }

  private shouldDeserialize(value: any): boolean {
    return value && typeof value === 'object' && 'json' in value && 'meta' in value;
  }
} 