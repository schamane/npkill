import { INodeVersion } from "@/interfaces/node-version.interface.js";
import { NoParamCallback } from "node:fs";
import { version } from "node:process";

export abstract class WindowsStrategy {
  private next: WindowsStrategy;
  protected major: number;
  protected minor: number;

  abstract remove(path: string, callback: NoParamCallback): boolean;
  abstract isSupported(major: number, minor: number): boolean;

  constructor() {
    const { major, minor } = this.getNodeVersion();
    this.major = major;
    this.minor = minor;
    this.next = this;
  }

  setNextStrategy(next: WindowsStrategy): WindowsStrategy {
    this.next = next;
    return next;
  }

  protected checkNext(path: string, callback: NoParamCallback): boolean {
    if (this.next === undefined) {
      return true;
    }
    return this.next.remove(path, callback);
  }

  private getNodeVersion(): INodeVersion {
    const releaseVersionsRegExp: RegExp = /^v(\d{1,2})\.(\d{1,2})\.(\d{1,2})/;
    const versionMatch = version.match(releaseVersionsRegExp);

    if (versionMatch === null || versionMatch.length < 4) {
      throw new Error(`Unable to parse Node version: ${version}`);
    }

    return {
      major: Number.parseInt(versionMatch[1]!, 10),
      minor: Number.parseInt(versionMatch[2]!, 10),
      patch: Number.parseInt(versionMatch[3]!, 10),
    };
  }
}
