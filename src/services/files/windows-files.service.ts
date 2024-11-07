// import getFolderSize from 'get-folder-size';
import { Signal, signal } from "@preact/signals-core";
import { FileService } from "@/services/files/files.service.js";
import { WindowsStrategyManager } from "@/strategies/windows-remove-dir.strategy.js";
import { FileWorkerService } from "@/services/files/files.worker.service.js";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";

export class WindowsFilesService extends FileService {
  private readonly windowsStrategyManager: WindowsStrategyManager =
    new WindowsStrategyManager();

  private folderSize = signal<number>(0);

  constructor(protected fileWorkerService: FileWorkerService) {
    super();
  }
  getFolderSize(path: string): Signal<number> {
    console.log(path);
    return this.folderSize;
    /*
    return new Observable((observer) => {
      getFolderSize.loose(path).then((size) => {
        observer.next(super.convertBytesToKB(size));
        observer.complete();
      });
    });
    */
  }

  listDir(parameters: IListDirParams): Signal<string> {
    const stream$ = new Signal<string>("");
    this.fileWorkerService.startScan(stream$, parameters);
    return stream$ as never;
  }

  async deleteDir(path: string): Promise<boolean> {
    return this.windowsStrategyManager.deleteDir(path);
  }
}
