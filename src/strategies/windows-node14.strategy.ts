import { NoParamCallback, rm } from "node:fs";
import { RM_NODE_VERSION_SUPPORT } from "@/constants/recursive-rmdir-node-support.constants.js";
import { WindowsStrategy } from "@/strategies/windows-strategy.abstract.js";

export class WindowsNode14Strategy extends WindowsStrategy {
  remove(path: string, callback: NoParamCallback): boolean {
    if (this.isSupported()) {
      rm(path, { recursive: true }, callback);
      return true;
    }
    return this.checkNext(path, callback);
  }

  isSupported(): boolean {
    return (
      this.major > RM_NODE_VERSION_SUPPORT.major ||
      (this.major === RM_NODE_VERSION_SUPPORT.major &&
        this.minor > RM_NODE_VERSION_SUPPORT.minor)
    );
  }
}
