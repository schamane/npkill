import ansiEscapes from "ansi-escapes";
import {
  HELP_HEADER,
  OPTIONS,
  HELP_FOOTER,
  HELP_PROGRESSBAR,
} from "../../constants/cli.constants.js";
import { MARGINS, UI_HELP } from "../../constants/main.constants.js";
import { INFO_MSGS } from "../../constants/messages.constants.js";
import { IPosition } from "../../interfaces/ui-positions.interface.js";
import { ConsoleService } from "../../services/console.service.js";
import { BaseUi } from "../base.ui.js";
import colors from "colors";

export class HelpUi extends BaseUi {
  constructor(private readonly consoleService: ConsoleService) {
    super();
  }

  render(): void {
    throw new Error("Method not implemented.");
  }

  show(): void {
    this.clear();
    this.print(colors.inverse(INFO_MSGS.HELP_TITLE + "\n\n"));
    this.print(HELP_HEADER + "\n\n");
    this.print(HELP_PROGRESSBAR + "\n\n");

    let lineCount = 0;
    for (const [index, option] of OPTIONS.entries()) {
      this.printAtHelp(
        option.arg.reduce(
          (text: string, argument: unknown) => text + ", " + argument,
        ),
        {
          x: UI_HELP.X_COMMAND_OFFSET,
          y: index + UI_HELP.Y_OFFSET + lineCount,
        },
      );
      const description = this.consoleService.splitWordsByWidth(
        option.description,
        this.terminal.columns - UI_HELP.X_DESCRIPTION_OFFSET,
      );

      for (const line of description) {
        this.printAtHelp(line, {
          x: UI_HELP.X_DESCRIPTION_OFFSET,
          y: index + UI_HELP.Y_OFFSET + lineCount,
        });
        ++lineCount;
      }
    }

    this.print(HELP_FOOTER + "\n");
  }

  clear(): void {
    for (let row = MARGINS.ROW_RESULTS_START; row < this.terminal.rows; row++) {
      this.clearLine(row);
    }
  }

  private printAtHelp(message: string, position: IPosition): void {
    this.setCursorAtHelp(position);
    this.print(message);
    if (!/-[A-Za-z]/.test(message.slice(0, 2)) && message !== "") {
      this.print("\n\n");
    }
  }

  private setCursorAtHelp({ x }: IPosition): void {
    this.print(ansiEscapes.cursorTo(x));
  }
}
