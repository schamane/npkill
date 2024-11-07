import fs, { accessSync, readFileSync, Stats, statSync } from "node:fs";
import type {
  IFileService,
  IFileStat,
} from "@/interfaces/file-service.interface.js";
import type { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
import { readdir, stat } from "node:fs/promises";
import type { Signal } from "@preact/signals-core";
import NodePath from "node:path";

export abstract class FileService implements IFileService {
  abstract getFolderSize(path: string): Signal<number>;
  abstract listDir(parameters: IListDirParams): Signal<string>;
  abstract deleteDir(path: string): Promise<boolean>;

  /** Used for dry-run or testing. */
  async fakeDeleteDir(): Promise<boolean> {
    const randomDelay = Math.floor(Math.random() * 4000 + 200);
    await new Promise((resolve) => setTimeout(resolve, randomDelay));
    return true;
  }

  isValidRootFolder(path: string): boolean {
    let stat: Stats;
    try {
      stat = statSync(path);
    } catch {
      throw new Error("The path does not exist.");
    }

    if (!stat.isDirectory()) {
      throw new Error("The path must point to a directory.");
    }

    try {
      accessSync(path, fs.constants.R_OK);
    } catch {
      throw new Error("Cannot read the specified path.");
    }

    return true;
  }

  convertKbToGB(kb: number): number {
    const factorKBtoGB = 1_048_576;
    return kb / factorKBtoGB;
  }

  convertBytesToKB(bytes: number): number {
    const factorBytestoKB = 1024;
    return bytes / factorBytestoKB;
  }

  convertGBToMB(gb: number): number {
    const factorGBtoMB = 1024;
    return gb * factorGBtoMB;
  }

  getFileContent(path: string): string {
    const encoding = "utf8";
    return readFileSync(path, encoding);
  }

  isSafeToDelete(path: string, targetFolder: string): boolean {
    return path.includes(targetFolder);
  }

  /**
   * > Why dangerous?
   * It is probable that if the node_module is included in some hidden directory, it is
   * required by some application like "spotify", "vscode" or "Discord" and deleting it
   * would imply breaking the application (until the dependencies are reinstalled).
   *
   * In the case of macOS applications and Windows AppData directory, these locations often contain
   * application-specific data or configurations that should not be tampered with. Deleting node_modules
   * from these locations could potentially disrupt the normal operation of these applications.
   */
  isDangerous(path: string): boolean {
    const hiddenFilePattern = /(^|\/)\.[^./]/g;
    const macAppsPattern = /(^|\/)Applications\/[^/]+\.app\//g;
    const windowsAppDataPattern = /(^|\\)AppData\\/g;

    return (
      hiddenFilePattern.test(path) ||
      macAppsPattern.test(path) ||
      windowsAppDataPattern.test(path)
    );
  }

  async getRecentModificationInDir(path: string): Promise<number> {
    const files = await this.getFileStatsInDir(path);
    const sorted = files.sort(
      (a, b) => b.modificationTime - a.modificationTime,
    );
    return sorted.length > 0 ? (sorted[0]?.modificationTime ?? -1) : -1;
  }

  async getFileStatsInDir(dirname: string): Promise<IFileStat[]> {
    const files: IFileStat[] = [];
    const items = await readdir(dirname, { withFileTypes: true });

    for (const item of items) {
      const path = NodePath.join(dirname, item.name);
      if (item.isDirectory()) {
        if (item.name === "node_modules") {
          continue;
        }
        files.push(...(await this.getFileStatsInDir(path).catch(() => [])));
      } else {
        const fileStat = await stat(path);
        files.push({ path, modificationTime: fileStat.mtimeMs / 1000 });
      }
    }

    return files;
  }
}
