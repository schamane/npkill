import type { IListDirParams } from "../interfaces/list-dir-params.interface.js";
import type { Signal } from "@preact/signals-core";

export interface IFileService {
  getFolderSize: (path: string) => Signal<number>;
  listDir: (parameters: IListDirParams) => Signal<string>;
  deleteDir: (path: string) => Promise<boolean>;
  fakeDeleteDir: (_path: string) => Promise<boolean>;
  isValidRootFolder: (path: string) => boolean;
  convertKbToGB: (kb: number) => number;
  convertBytesToKB: (bytes: number) => number;
  convertGBToMB: (gb: number) => number;
  getFileContent: (path: string) => string;
  isSafeToDelete: (path: string, targetFolder: string) => boolean;
  isDangerous: (path: string) => boolean;
  getRecentModificationInDir: (path: string) => Promise<number>;
  getFileStatsInDir: (dirname: string) => Promise<IFileStat[]>;
}

export interface IFileStat {
  path: string;
  modificationTime: number;
}
