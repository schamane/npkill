import { WindowsDefaultStrategy } from "@/strategies/windows-default.strategy.js";
import { WindowsNode12Strategy } from "@/strategies/windows-node12.strategy.js";
import { WindowsNode14Strategy } from "@/strategies/windows-node14.strategy.js";
import { WindowsStrategy } from "@/strategies/windows-strategy.abstract.js";

export class WindowsStrategyManager {
  async deleteDir(path: string): Promise<boolean> {
    const windowsStrategy: WindowsStrategy = new WindowsNode14Strategy();
    windowsStrategy
      .setNextStrategy(new WindowsNode12Strategy())
      .setNextStrategy(new WindowsDefaultStrategy());

    return new Promise((resolve, reject) => {
      windowsStrategy.remove(path, (error) => {
        if (error !== null) {
          reject(error);
          return;
        }
        resolve(true);
      });
    });
  }
}
