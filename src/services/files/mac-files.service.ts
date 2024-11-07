import { Signal, signal } from "@preact/signals-core";
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { UnixFilesService } from "@/services/files/unix-files.service.js";

export class MacFilesService extends UnixFilesService {
  getFolderSize(path: string): Signal<number> {
    const du = spawn("du", ["-sk", path]);
    const cut = spawn("cut", ["-f", "1"]);

    let buffer = Buffer.alloc(0);
    const folderSize = signal<number>(0);

    du.stdout.pipe(cut.stdin);

    cut.stdout.on("data", (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
    });

    cut.on("close", () => {
      folderSize.value = +buffer.toString("utf8");
    });

    return folderSize;
  }
}
