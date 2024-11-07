import { spawn } from "node:child_process";
import { UnixFilesService } from "@/services/files/unix-files.service.js";
import { signal, Signal } from "@preact/signals-core";

export class LinuxFilesService extends UnixFilesService {
  private folderSize = signal<number>(0);
  getFolderSize(path: string): Signal<number> {
    const du = spawn("du", ["-sk", path]);
    const cut = spawn("cut", ["-f", "1"]);
    du.stdout.pipe(cut.stdin);

    return this.folderSize;
    // const command = spawn('sh', ['-c', `du -sk ${path} | cut -f 1`]);
    // return this.streamService.getStream(command).pipe(map((size) => +size));
    //
    // return this.streamService.getStream<string>(cut).pipe(map((size) => +size));
    // const stream$ = new BehaviorSubject(null);
    // this.fileWorkerService.getSize(stream$, path);
    // this.dirSize(path).then((result) => {
    //   stream$.next(result / 1024);
    // });
    // return stream$;
  }
}
