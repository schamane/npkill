import {
  DECIMALS_SIZE,
  DEFAULT_CONFIG,
  MARGINS,
  OVERFLOW_CUT_FROM,
} from "@/constants/main.constants.js";
import { InteractiveUi } from "@/ui/base.ui.js";
import { HeavyUi } from "@/ui/heavy.ui.js";
import { ConsoleService } from "@/services/console.service.js";
import { FileService } from "@/services/files/files.service.js";
import { IConfig } from "@/interfaces/config.interface.js";
import { IFolder } from "@/interfaces/folder.interface.js";
import { IKeyPress } from "@/interfaces/key-press.interface.js";
import { INFO_MSGS } from "@/constants/messages.constants.js";
import { ResultsService } from "@/services/results.service.js";
import colors from "colors";
import NodePath from "node:path";
import { ColorFn } from "@/ui/utils.js";
import { signal } from "@preact/signals-core";

export class ResultsUi extends HeavyUi implements InteractiveUi {
  resultIndex = 0;
  previousIndex = 0;
  scroll: number = 0;
  private haveResultsAfterCompleted = true;

  readonly delete$ = signal<IFolder>();
  readonly showErrors$ = signal<null>();
  readonly openFolder$ = signal<string>();

  private readonly config: IConfig = DEFAULT_CONFIG;
  private readonly KEYS: Record<string, () => void> = {
    up: () => this.cursorUp(),
    down: () => this.cursorDown(),
    space: () => this.delete(),
    delete: () => this.delete(),
    j: () => this.cursorDown(),
    k: () => this.cursorUp(),
    h: () => this.cursorPageDown(),
    l: () => this.cursorPageUp(),
    d: () => this.cursorPageDown(),
    u: () => this.cursorPageUp(),
    pageup: () => this.cursorPageUp(),
    pagedown: () => this.cursorPageDown(),
    home: () => this.cursorFirstResult(),
    end: () => this.cursorLastResult(),
    e: () => this.showErrorsPopup(),
    o: () => this.openFolder(),
  };

  constructor(
    private readonly resultsService: ResultsService,
    private readonly consoleService: ConsoleService,
    private readonly fileService: FileService,
  ) {
    super();
  }

  private openFolder(): void {
    const folder = this.resultsService.results[this.resultIndex];
    if (!folder) {
      return;
    }
    const parentPath = NodePath.resolve(folder.path, "..");
    this.openFolder$.value = parentPath;
  }

  onKeyInput({ name }: IKeyPress): void {
    const action = this.KEYS[name];
    if (action === undefined) {
      return;
    }
    action();
    this.render();
  }

  render(): void {
    if (!this.haveResultsAfterCompleted) {
      this.noResults();
      return;
    }

    this.printResults();
    this.flush();
  }

  clear(): void {
    for (let row = MARGINS.ROW_RESULTS_START; row < this.terminal.rows; row++) {
      this.clearLine(row);
    }
  }

  completeSearch(): void {
    if (this.resultsService.results.length === 0) {
      this.haveResultsAfterCompleted = false;
      this.render();
    }
  }

  private printResults(): void {
    const visibleFolders = this.getVisibleScrollFolders();

    for (const [index, folder] of visibleFolders.entries()) {
      const row = MARGINS.ROW_RESULTS_START + index;
      this.printFolderRow(folder, row);
    }
  }

  private noResults(): void {
    const targetFolderColored: string = ColorFn(DEFAULT_CONFIG.warningColor)(
      this.config.targetFolder,
    );
    const message = `No ${targetFolderColored} found!`;
    this.printAt(message, {
      x: Math.floor(this.terminal.columns / 2 - message.length / 2),
      y: MARGINS.ROW_RESULTS_START + 2,
    });
  }

  private printFolderRow(folder: IFolder, row: number): void {
    this.clearLine(row);
    let { path, lastModification, size } = this.getFolderTexts(folder);
    const isRowSelected = row === this.getRealCursorPosY();

    lastModification = colors.gray(lastModification);
    if (isRowSelected) {
      path = ColorFn(this.config.backgroundColor)(path);
      size = ColorFn(this.config.backgroundColor)(size);
      lastModification = ColorFn(this.config.backgroundColor)(lastModification);

      this.paintBgRow(row);
    }

    if (folder.isDangerous) {
      path = ColorFn(DEFAULT_CONFIG.warningColor)(path + "⚠️");
    }

    this.printAt(path, {
      x: MARGINS.FOLDER_COLUMN_START,
      y: row,
    });
    this.printAt(lastModification, {
      x: this.terminal.columns - MARGINS.FOLDER_SIZE_COLUMN - 6,
      y: row,
    });
    this.printAt(size, {
      x: this.terminal.columns - MARGINS.FOLDER_SIZE_COLUMN,
      y: row,
    });
  }

  private getFolderTexts(folder: IFolder): {
    path: string;
    size: string;
    lastModification: string;
  } {
    const folderText = this.getFolderPathText(folder);
    let folderSize = `${folder.size.toFixed(DECIMALS_SIZE)} GB`;
    let daysSinceLastModification: string;

    daysSinceLastModification =
      folder.modificationTime !== null && folder.modificationTime > 0
        ? `${Math.floor((Date.now() / 1000 - folder.modificationTime) / 86_400)}d`
        : "--";

    if (folder.isDangerous) {
      daysSinceLastModification = "xx";
    }

    // Align to right
    const alignMargin = 4 - daysSinceLastModification.length;
    daysSinceLastModification =
      " ".repeat(alignMargin > 0 ? alignMargin : 0) + daysSinceLastModification;

    if (!this.config.folderSizeInGB) {
      const size = this.fileService.convertGBToMB(folder.size);
      // Prevent app crash when folder size is +999MB.
      const decimals = size < 999 ? DECIMALS_SIZE : 1;
      const sizeText = size.toFixed(decimals);
      const OFFSET_COLUMN = 6;
      const space = " ".repeat(OFFSET_COLUMN - sizeText.length);
      folderSize = `${space}${sizeText} MB`;
    }

    const folderSizeText = folder.size > 0 ? folderSize : "--";

    return {
      path: folderText,
      size: folderSizeText,
      lastModification: daysSinceLastModification,
    };
  }

  cursorUp(): void {
    this.moveCursor(-1);
  }

  cursorDown(): void {
    this.moveCursor(1);
  }

  cursorPageUp(): void {
    const resultsInPage = this.getRowsAvailable();
    this.moveCursor(-(resultsInPage - 2));
  }

  cursorPageDown(): void {
    const resultsInPage = this.getRowsAvailable();
    this.moveCursor(resultsInPage - 2);
  }

  cursorFirstResult(): void {
    this.moveCursor(-this.resultIndex);
  }

  cursorLastResult(): void {
    this.moveCursor(this.resultsService.results.length - 1);
  }

  fitScroll(): void {
    const shouldScrollUp =
      this.getRow(this.resultIndex) <
      MARGINS.ROW_RESULTS_START + this.scroll + 1;

    const shouldScrollDown =
      this.getRow(this.resultIndex) > this.terminal.rows + this.scroll - 2;

    const isOnBotton =
      this.resultIndex === this.resultsService.results.length - 1;

    let scrollRequired = 0;

    if (shouldScrollUp) {
      scrollRequired =
        this.getRow(this.resultIndex) -
        MARGINS.ROW_RESULTS_START -
        this.scroll -
        1;
    } else if (shouldScrollDown) {
      scrollRequired =
        this.getRow(this.resultIndex) - this.terminal.rows - this.scroll + 2;

      if (isOnBotton) {
        scrollRequired -= 1;
      }
    }

    if (scrollRequired !== 0) {
      this.scrollFolderResults(scrollRequired);
    }
  }

  scrollFolderResults(scrollAmount: number): void {
    const virtualFinalScroll = this.scroll + scrollAmount;
    this.scroll = this.clamp(
      virtualFinalScroll,
      0,
      this.resultsService.results.length,
    );
    this.clear();
  }

  private moveCursor(index: number): void {
    this.previousIndex = this.resultIndex;
    this.resultIndex += index;

    // Upper limit
    if (this.isCursorInLowerLimit()) {
      this.resultIndex = 0;
    }

    // Lower limit
    if (this.isCursorInUpperLimit()) {
      this.resultIndex = this.resultsService.results.length - 1;
    }

    this.fitScroll();
  }

  private getFolderPathText(folder: IFolder): string {
    let cutFrom = OVERFLOW_CUT_FROM;
    let text = folder.path;
    const ACTIONS: Record<string, () => void> = {
      deleted: () => {
        cutFrom += INFO_MSGS.DELETED_FOLDER.length;
        text = INFO_MSGS.DELETED_FOLDER + text;
      },
      deleting: () => {
        cutFrom += INFO_MSGS.DELETING_FOLDER.length;
        text = INFO_MSGS.DELETING_FOLDER + text;
      },
      "error-deleting": () => {
        cutFrom += INFO_MSGS.ERROR_DELETING_FOLDER.length;
        text = INFO_MSGS.ERROR_DELETING_FOLDER + text;
      },
    };

    if (folder.status in ACTIONS) {
      ACTIONS[folder.status]!();
    }

    text = this.consoleService.shortenText(
      text,
      this.terminal.columns - MARGINS.FOLDER_COLUMN_END,
      cutFrom,
    );

    // This is necessary for the coloring of the text, since
    // the shortener takes into ansi-scape codes invisible
    // characters and can cause an error in the cli.
    text = this.paintStatusFolderPath(text, folder.status);

    return text;
  }

  private paintStatusFolderPath(folderString: string, action: string): string {
    const TRANSFORMATIONS: Record<string, (text: string) => string> = {
      deleted: (text: string) =>
        text.replace(
          INFO_MSGS.DELETED_FOLDER,
          colors.green(INFO_MSGS.DELETED_FOLDER),
        ),
      deleting: (text: string) =>
        text.replace(
          INFO_MSGS.DELETING_FOLDER,
          colors.yellow(INFO_MSGS.DELETING_FOLDER),
        ),
      "error-deleting": (text: string) =>
        text.replace(
          INFO_MSGS.ERROR_DELETING_FOLDER,
          colors.red(INFO_MSGS.ERROR_DELETING_FOLDER),
        ),
    };

    return action in TRANSFORMATIONS
      ? TRANSFORMATIONS[action]!(folderString)
      : folderString;
  }

  private isCursorInLowerLimit(): boolean {
    return this.resultIndex < 0;
  }

  private isCursorInUpperLimit(): boolean {
    return this.resultIndex >= this.resultsService.results.length;
  }

  private getRealCursorPosY(): number {
    return this.getRow(this.resultIndex) - this.scroll;
  }

  private getVisibleScrollFolders(): IFolder[] {
    return this.resultsService.results.slice(
      this.scroll,
      this.getRowsAvailable() + this.scroll,
    );
  }

  private paintBgRow(row: number): void {
    const startPaint = MARGINS.FOLDER_COLUMN_START;
    const endPaint = this.terminal.columns - MARGINS.FOLDER_SIZE_COLUMN;
    let paintSpaces = "";

    for (let index = startPaint; index < endPaint; ++index) {
      paintSpaces += " ";
    }

    const {
      config: { backgroundColor },
    } = this;

    const color = ColorFn(backgroundColor);
    this.printAt(color(paintSpaces), {
      x: startPaint,
      y: row,
    });
  }

  private delete(): void {
    const folder = this.resultsService.results[this.resultIndex];
    if (folder) {
      this.delete$.value = folder;
    }
  }

  /** Returns the number of results that can be displayed. */
  private getRowsAvailable(): number {
    return this.terminal.rows - MARGINS.ROW_RESULTS_START;
  }

  /** Returns the row to which the index corresponds. */
  private getRow(index: number): number {
    return index + MARGINS.ROW_RESULTS_START;
  }

  private showErrorsPopup(): void {
    this.showErrors$.value = null;
  }

  private clamp(number_: number, min: number, max: number): number {
    return Math.min(Math.max(number_, min), max);
  }
}
