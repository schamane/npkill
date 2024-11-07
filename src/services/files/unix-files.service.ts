import { exec } from "node:child_process";
import { FileService } from "@/services/files/files.service.js";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
import { FileWorkerService } from "@/services/files/files.worker.service.js";
import { signal, Signal } from "@preact/signals-core";

export abstract class UnixFilesService extends FileService {
  constructor(protected fileWorkerService: FileWorkerService) {
    super();
  }

  abstract override getFolderSize(path: string): Signal<number>;

  listDir(parameters: IListDirParams): Signal<string> {
    const stream$ = signal<string>("");
    this.fileWorkerService.startScan(stream$, parameters);
    return stream$ as never;
  }

  async deleteDir(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const command = `rm -rf "${path}"`;
      exec(command, (error, _, stderr) => {
        if (error !== null) {
          reject(error);
          return;
        }
        if (stderr !== "") {
          reject(stderr);
          return;
        }
        resolve(true);
      });
    });
  }

  protected prepareFindArgs(parameters: IListDirParams) {
    const { path, target, exclude } = parameters;
    let args = [path];

    if (exclude?.length) {
      args = [...args, this.prepareExcludeArgs(exclude)].flat();
    }

    args = [...args, "-name", target, "-prune"];

    return args;
  }

  protected prepareExcludeArgs(exclude: string[]) {
    const excludeDirectories = exclude.map((dir: string) => [
      "-not",
      "(",
      "-name",
      dir,
      "-prune",
      ")",
    ]);
    return excludeDirectories.flat();
  }
}
