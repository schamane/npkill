import { Dir, Dirent } from "node:fs";
import { opendir } from "node:fs/promises";
import { WorkerMessage } from "./files.worker.service";
import NodePath from "node:path";
import { MessagePort, parentPort } from "node:worker_threads";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
import { EVENTS, MAX_PROCS } from "@/constants/workers.constants.js";
import { signal } from "@preact/signals-core";

enum ETaskOperation {
  "explore",
  "getSize",
}
interface Task {
  operation: ETaskOperation;
  path: string;
}

class CustomEvent<T> extends Event {
  payload: T;

  constructor(name: string, payload: T) {
    super(name);
    this.payload = payload;
  }
}

(() => {
  let id = 0;
  let fileWalker: FileWalker;
  let tunnel: MessagePort;

  if (parentPort === null) {
    throw new Error("Worker must be spawned from a parent thread.");
  }

  parentPort.on("message", (message: WorkerMessage) => {
    if (message?.type === EVENTS.startup) {
      id = message.value.id;
      tunnel = message.value.channel;
      fileWalker = new FileWalker();
      initTunnelListeners();
      initFileWalkerListeners();
      notifyWorkerReady();
    }
  });

  function notifyWorkerReady(): void {
    tunnel.postMessage({
      type: EVENTS.alive,
      value: null,
    });
  }

  function initTunnelListeners(): void {
    tunnel.on("message", (message: WorkerMessage) => {
      if (message?.type === EVENTS.exploreConfig) {
        fileWalker.setSearchConfig(message.value);
      }

      if (message?.type === EVENTS.explore) {
        fileWalker.enqueueTask(message.value.path);
      }
    });
  }

  function initFileWalkerListeners(): void {
    fileWalker.events.addEventListener("newResult", (event) => {
      const {
        payload: { results },
      } = event as CustomEvent<{ results: unknown }>;
      tunnel.postMessage({
        type: EVENTS.scanResult,
        value: { results, workerId: id, pending: fileWalker.pendingJobs },
      });
    });
  }
})();

class FileWalker {
  readonly events = new EventTarget();
  readonly eves = signal<unknown[]>([]);

  private searchConfig: IListDirParams = {
    path: "",
    target: "",
    exclude: [],
  };

  private readonly taskQueue: Task[] = [];
  private completedTasks = 0;
  private procs = 0;

  setSearchConfig(parameters: IListDirParams): void {
    this.searchConfig = parameters;
  }

  enqueueTask(path: string): void {
    this.taskQueue.push({ path, operation: ETaskOperation.explore });
    this.processQueue();
  }

  private async run(path: string): Promise<void> {
    this.updateProcs(1);

    try {
      const dir = await opendir(path);
      await this.analizeDir(path, dir);
    } catch {
      this.completeTask();
    }
  }

  private async analizeDir(path: string, dir: Dir): Promise<void> {
    const results: unknown[] = [];
    for await (const dirent of dir) {
      results.push(this.newDirEntry(path, dirent));
    }

    this.events.dispatchEvent(new CustomEvent("newResult", { results }));

    await dir.close();

    this.completeTask();

    if (this.taskQueue.length === 0 && this.procs === 0) {
      this.completeAll();
    }
  }

  private newDirEntry(path: string, entry: Dirent) {
    const subpath = NodePath.join(path, entry.name);
    const shouldSkip = !entry.isDirectory() || this.isExcluded(subpath);
    if (shouldSkip) {
      return {};
    }

    return {
      path: subpath,
      isTarget: this.isTargetFolder(entry.name),
    };
  }

  private isExcluded(path: string): boolean {
    if (this.searchConfig.exclude === undefined) {
      return false;
    }

    for (let index = 0; index < this.searchConfig.exclude.length; index++) {
      const excludeString = this.searchConfig.exclude[index]!;
      if (path.includes(excludeString)) {
        return true;
      }
    }

    return false;
  }

  private isTargetFolder(path: string): boolean {
    // return basename(path) === this.searchConfig.target;
    return path === this.searchConfig.target;
  }

  private completeTask(): void {
    this.updateProcs(-1);
    this.processQueue();
    this.completedTasks++;
  }

  private updateProcs(value: number): void {
    this.procs += value;
  }

  private processQueue(): void {
    while (this.procs < MAX_PROCS && this.taskQueue.length > 0) {
      const path = this.taskQueue.shift()?.path;
      if (path === undefined || path === "") {
        return;
      }

      // Ignore as other mechanisms (pending/completed tasks) are used to
      // check the progress of this.
      this.run(path);
    }
  }

  private completeAll(): void {
    // Any future action.
  }

  /*  get stats(): WorkerStats {
    return {
      pendingSearchTasks: this.taskQueue.length,
      completedSearchTasks: this.completedTasks,
      procs: this.procs,
    };
  } */

  get pendingJobs(): number {
    return this.taskQueue.length;
  }
}
