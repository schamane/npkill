import type { ICliOptions } from "@/interfaces/cli-options.interface.js";
import path from "node:path";
import readline from "node:readline";
import { StartParameters } from "@/models/start-parameters.model.js";
import { WIDTH_OVERFLOW } from "@/constants/main.constants.js";
import { OPTIONS } from "@/constants/cli.constants.js";

const { stdin } = process;

export class ConsoleService {
  private static options = new StartParameters();

  dispatch() {
    ConsoleService.options.reset();
  }

  getParameters(rawArgv: string[]): StartParameters {
    // This needs a refactor, but fck, is a urgent update
    const rawProgramArgvs = this.removeSystemArgvs(rawArgv);
    const argvs = this.normalizeParams(rawProgramArgvs);
    for (const [index, argv] of argvs.entries()) {
      if (!this.isArgOption(argv) || !this.isValidOption(argv)) {
        continue;
      }
      const nextArgv = argvs[index + 1] ?? "";
      const option = this.getOption(argv);

      if (!option) {
        throw new Error("Invalid option name.");
      }

      const { name } = option;
      ConsoleService.options.add(
        name,
        this.isArgHavingParams(nextArgv) ? nextArgv : true,
      );
    }

    return ConsoleService.options;
  }

  splitWordsByWidth(text: string, width: number): string[] {
    const splitRegex = new RegExp(
      `(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`,
      "g",
    );
    const splitText = this.replaceString(text, splitRegex, "$1\n");
    return this.splitData(splitText);
  }

  splitData(data: string, separator = "\n"): string[] {
    return data.split(separator).filter(Boolean);
  }

  replaceString(
    text: string,
    textToReplace: string | RegExp,
    replaceValue: string,
  ): string {
    return text.replace(textToReplace, replaceValue);
  }

  shortenText(text: string, width: number, startCut = 0): string {
    if (!this.isValidShortenParams(text, width, startCut)) {
      return text;
    }

    const startPartB = text.length + startCut + WIDTH_OVERFLOW.length - width;
    const partA = text.slice(0, startCut);
    const partB = text.slice(startPartB);

    return `${partA}${WIDTH_OVERFLOW}${partB}`;
  }

  isRunningBuild(): boolean {
    return path.extname(import.meta.url) === ".js";
  }

  startListenKeyEvents(): void {
    readline.emitKeypressEvents(stdin);
  }

  /** Argvs can be specified for example by
   *  "--sort size" and "--sort=size". The main function
   *  expect the parameters as the first form so this
   *  method convert the second to first.
   */
  private normalizeParams(argvs: string[]): string[] {
    return argvs.join("=").split("=");
  }

  private isValidShortenParams(
    text: string,
    width: number,
    startCut: number,
  ): boolean {
    return (
      startCut <= width &&
      text.length >= width &&
      !this.isNegative(width) &&
      !this.isNegative(startCut)
    );
  }

  private removeSystemArgvs(allArgv: string[]): string[] {
    return allArgv.slice(2);
  }

  private isArgOption(argv: string): boolean {
    return argv.charAt(0) === "-";
  }

  private isArgHavingParams(nextArgv: string): boolean {
    return (
      nextArgv !== undefined && nextArgv !== "" && !this.isArgOption(nextArgv)
    );
  }

  private isValidOption(argument: string): boolean {
    return OPTIONS.some(({ arg }) => arg.includes(argument));
  }

  private getOption(argument: string): ICliOptions | undefined {
    return OPTIONS.find(({ arg }) => arg.includes(argument));
  }

  private isNegative(numb: number): boolean {
    return numb < 0;
  }
}
