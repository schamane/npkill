import { NoParamCallback, rmdir } from "node:fs";
import { WindowsStrategy } from "@/strategies/windows-strategy.abstract.js";
import { RECURSIVE_RMDIR_NODE_VERSION_SUPPORT } from "@/constants/recursive-rmdir-node-support.constants.js";

export class WindowsNode12Strategy extends WindowsStrategy {
  remove(path: string, callback: NoParamCallback): boolean {
    if (this.isSupported()) {
      rmdir(path, { recursive: true }, callback);
      return true;
    }
    return this.checkNext(path, callback);
  }

  isSupported(): boolean {
    return (
      this.major > RECURSIVE_RMDIR_NODE_VERSION_SUPPORT.major ||
      (this.major === RECURSIVE_RMDIR_NODE_VERSION_SUPPORT.major &&
        this.minor > RECURSIVE_RMDIR_NODE_VERSION_SUPPORT.minor)
    );
  }
}
