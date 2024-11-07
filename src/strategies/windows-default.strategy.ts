import { NoParamCallback, lstat, readdir, rmdir, unlink } from "node:fs";
import { WindowsStrategy } from "@/strategies/windows-strategy.abstract.js";
import nodePath from "node:path";
import { RECURSIVE_RMDIR_IGNORED_ERROR_CODES } from "@/constants/recursive-rmdir-node-support.constants.js";

export class WindowsDefaultStrategy extends WindowsStrategy {
  remove(dirOrFilePath: string, callback: NoParamCallback): boolean {
    lstat(dirOrFilePath, (lstatError, stats) => {
      //  No such file or directory - Done
      if (lstatError !== null && lstatError.code === "ENOENT") {
        callback();
        return;
      }

      if (stats.isDirectory()) {
        this.removeDirectory(dirOrFilePath, callback);
        return;
      }

      unlink(dirOrFilePath, (rmError) => {
        //  No such file or directory - Done
        if (rmError && rmError.code === "ENOENT") {
          callback();
          return;
        }

        if (rmError && rmError.code === "EISDIR") {
          this.removeDirectory(dirOrFilePath, callback);
          return;
        }

        callback(rmError);
      });
    });
    return true;
  }

  isSupported() {
    return true;
  }

  private removeDirectory(path: string, callback: NoParamCallback) {
    rmdir(path, (rmDirError) => {
      //  We ignore certain error codes
      //  in order to simulate 'recursive' mode
      if (
        rmDirError?.code !== undefined &&
        RECURSIVE_RMDIR_IGNORED_ERROR_CODES.includes(rmDirError.code)
      ) {
        this.removeChildren(path, callback);
        return;
      }

      callback(rmDirError);
    });
  }

  private removeChildren(path: string, callback: NoParamCallback) {
    readdir(path, (readdirError, ls) => {
      if (readdirError !== null) {
        return callback(readdirError);
      }

      let contentInDirectory = ls.length;
      let done = false;

      //  removeDirectory only allows deleting directories
      //  that has no content inside (empty directory).
      if (contentInDirectory === 0) {
        rmdir(path, callback);
        return;
      }

      for (const dirOrFile of ls) {
        const dirOrFilePath = nodePath.join(path, dirOrFile);

        this.remove(dirOrFilePath, (error) => {
          if (done) {
            return;
          }

          if (error !== null) {
            done = true;
            return callback(error);
          }

          contentInDirectory--;
          //  No more content inside.
          //  Remove the directory.
          if (contentInDirectory === 0) {
            rmdir(path, callback);
          }
        });
      }
    });
  }
}
