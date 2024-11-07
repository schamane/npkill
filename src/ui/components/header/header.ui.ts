import {
  BANNER,
  DEFAULT_SIZE,
  UI_POSITIONS,
} from "@/constants/main.constants.js";
import { HELP_MSGS, INFO_MSGS } from "@/constants/messages.constants.js";
import { BaseUi } from "@/ui/base.ui.js";
import colors from "colors";

export class HeaderUi extends BaseUi {
  programVersion: string = "";
  isDryRun: boolean = false;

  columns = this.terminal.columns;

  render(): void {
    // banner and tutorial
    this.printAt(BANNER, UI_POSITIONS.INITIAL);
    this.renderHeader();

    if (this.programVersion !== undefined) {
      this.printAt(colors.gray(this.programVersion), UI_POSITIONS.VERSION);
    }

    if (this.isDryRun) {
      this.printAt(
        colors.black(colors.bgMagenta(` ${INFO_MSGS.DRY_RUN} `)),
        UI_POSITIONS.DRY_RUN_NOTICE,
      );
    }

    // Columns headers
    this.printAt(colors.bgYellow(colors.black(INFO_MSGS.HEADER_COLUMNS)), {
      x: this.columns - INFO_MSGS.HEADER_COLUMNS.length - 4,
      y: UI_POSITIONS.FOLDER_SIZE_HEADER.y,
    });

    // npkill stats
    this.printAt(
      colors.gray(INFO_MSGS.TOTAL_SPACE + DEFAULT_SIZE),
      UI_POSITIONS.TOTAL_SPACE,
    );
    this.printAt(
      colors.gray(INFO_MSGS.SPACE_RELEASED + DEFAULT_SIZE),
      UI_POSITIONS.SPACE_RELEASED,
    );
  }

  private renderHeader(): void {
    const spaceToFill = Math.max(
      0,
      this.columns - HELP_MSGS.BASIC_USAGE.length - 2,
    );
    const text = `${HELP_MSGS.BASIC_USAGE}${" ".repeat(spaceToFill)}`;
    this.printAt(
      colors.yellow(colors.inverse(text)),
      UI_POSITIONS.TUTORIAL_TIP,
    );
  }
}
