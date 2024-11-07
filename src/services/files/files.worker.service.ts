import os from "node:os";
import NodePath from "node:path";
import { Worker, MessageChannel, MessagePort } from "node:worker_threads";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
import { SearchStatus } from "@/models/search-state.model.js";
import { LoggerService } from "@/services/logger.service.js";
import { MAX_WORKERS, EVENTS } from "../../constants/workers.constants.js";
import { Signal } from "@preact/signals-core";

export type WorkerStatus = "stopped" | "scanning" | "dead" | "finished";
interface WorkerJob {
  job: "explore"; // | 'getSize';
  value: { path: string };
}

export interface WorkerMessage {
  type: EVENTS;
  value: any;
}

export interface WorkerStats {
  pendingSearchTasks: number;
  completedSearchTasks: number;
  procs: number;
}

export class FileWorkerService {
  private index = 0;
  private workers: Worker[] = [];
  private workersPendingJobs: number[] = [];
  private pendingJobs = 0;
  private totalJobs = 0;
  private tunnels: MessagePort[] = [];

  constructor(
    private readonly logger: LoggerService,
    private readonly searchStatus: SearchStatus,
  ) {}

  startScan(stream$: Signal<string>, parameters: IListDirParams): void {
    this.instantiateWorkers(this.getOptimalNumberOfWorkers());
    this.listenEvents(stream$);
    this.setWorkerConfig(parameters);

    // Manually add the first job.
    this.addJob({ job: "explore", value: { path: parameters.path } });
  }

  private listenEvents(stream$: Signal<string>): void {
    for (const tunnel of this.tunnels) {
      tunnel.on("message", (data: WorkerMessage) => {
        this.newWorkerMessage(data, stream$);
      });

      for (const [index, worker] of this.workers.entries()) {
        worker.on("exit", () => {
          this.logger.info(`Worker ${index} exited.`);
        });

        worker.on("error", (error) => {
          // Respawn worker.
          throw error;
        });
      }
    }
  }

  private newWorkerMessage(
    message: WorkerMessage,
    stream$: Signal<string>,
  ): void {
    const { type, value } = message;

    if (type === EVENTS.scanResult) {
      const results: Array<{ path: string; isTarget: boolean }> = value.results;
      const workerId: number = value.workerId;
      this.workersPendingJobs[workerId] = value.pending;

      for (const result of results) {
        const { path, isTarget } = result;
        if (isTarget) {
          stream$.value = path;
        } else {
          this.addJob({
            job: "explore",
            value: { path },
          });
        }
      }

      this.pendingJobs = this.getPendingJobs();
      this.checkJobComplete();
    }

    if (type === EVENTS.alive) {
      this.searchStatus.workerStatus = "scanning";
    }
  }

  /** Jobs are distributed following the round-robin algorithm. */
  private addJob(job: WorkerJob): void {
    if (job.job === "explore") {
      const tunnel = this.tunnels[this.index]!;
      const message: WorkerMessage = { type: EVENTS.explore, value: job.value };
      tunnel.postMessage(message);
      this.workersPendingJobs[this.index]!++;
      this.totalJobs++;
      this.pendingJobs++;
      this.index = this.index >= this.workers.length - 1 ? 0 : this.index + 1;
    }
  }

  private checkJobComplete() {
    this.updateStats();
    const isCompleted = this.getPendingJobs() === 0;
    if (isCompleted) {
      this.searchStatus.workerStatus = "finished";
      // Todo: check what to do with signal
      // stream$.complete();
      void this.killWorkers();
    }
  }

  private instantiateWorkers(amount: number): void {
    this.logger.info(`Instantiating ${amount} workers..`);
    for (let index = 0; index < amount; index++) {
      const { port1, port2 } = new MessageChannel();
      const worker = new Worker(this.getWorkerPath());
      this.tunnels.push(port1);
      worker.postMessage(
        { type: EVENTS.startup, value: { channel: port2, id: index } },
        [port2], // Prevent clone the object and pass the original.
      );
      this.workers.push(worker);
      this.logger.info(`Worker ${index} instantiated.`);
    }
  }

  private setWorkerConfig(parameters: IListDirParams): void {
    for (const tunnel of this.tunnels)
      tunnel.postMessage({
        type: EVENTS.exploreConfig,
        value: parameters,
      });
  }

  private async killWorkers(): Promise<void> {
    for (let index = 0; index < this.workers.length; index++) {
      this.workers[index]!.removeAllListeners();
      this.tunnels[index]!.removeAllListeners();
      await this.workers[index]!.terminate().catch((error) =>
        this.logger.error(error),
      );
    }
    this.workers = [];
    this.tunnels = [];
  }

  private getPendingJobs(): number {
    return this.workersPendingJobs.reduce(
      (accumulator, x) => x + accumulator,
      0,
    );
  }

  private updateStats(): void {
    this.searchStatus.pendingSearchTasks = this.pendingJobs;
    this.searchStatus.completedSearchTasks = this.totalJobs;
    this.searchStatus.workersJobs = this.workersPendingJobs;
  }

  private getWorkerPath() {
    const actualFilePath = import.meta.url;
    const dirPath = NodePath.dirname(actualFilePath);
    // Extension = .ts if is not transpiled.
    // Extension = .js if is a build
    const extension = NodePath.extname(actualFilePath);
    return new URL(NodePath.join(dirPath, `files.worker${extension}`));
  }

  private getOptimalNumberOfWorkers(): number {
    const cores = os.cpus().length;
    // TODO calculate amount of RAM available and take it
    // as part on the ecuation.
    const numberWorkers = cores > MAX_WORKERS ? MAX_WORKERS : cores - 1;
    return numberWorkers < 1 ? 1 : numberWorkers;
  }
}
