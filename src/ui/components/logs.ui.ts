import { LoggerService } from "../../services/logger.service.js";
import { InteractiveUi, BaseUi } from "@/ui/base.ui.js";
import colors from "colors";
import { IPosition } from "@/interfaces/ui-positions.interface.js";
import { IKeyPress } from "@/interfaces/key-press.interface.js";
import { ColorFn } from "@/ui/utils.js";
import { signal } from "@preact/signals-core";

export class LogsUi extends BaseUi implements InteractiveUi {
  readonly close$ = signal<null>();
  private size: IPosition = { x: 0, y: 0 };
  private errors = 0;
  private pages: string[][] = [];
  private actualPage = 0;

  private readonly KEYS: Record<string, () => void> = {
    e: () => this.cyclePages(),
    escape: () => this.close(),
  };

  constructor(private readonly logger: LoggerService) {
    super();
    this.setVisible(false, false);
  }

  onKeyInput({ name }: IKeyPress): void {
    const action = this.KEYS[name];
    if (action === undefined) {
      return;
    }
    action();
  }

  render(): void {
    this.renderPopup();
  }

  private cyclePages(): void {
    this.actualPage++;
    if (this.actualPage >= this.pages.length) {
      this.actualPage = 0;
      this.close();
      return;
    }

    this.render();
  }

  private close(): void {
    this.close$.value = null;
  }

  private renderPopup(): void {
    this.calculatePosition();
    for (let x = this.position.x; x < this.size.x; x++) {
      for (let y = this.position.y; y < this.size.y; y++) {
        let char = " ";
        if (x === this.position.x || x === this.size.x - 1) {
          char = "│";
        }
        if (y === this.position.y) {
          char = "═";
        }
        if (y === this.size.y - 1) {
          char = "─";
        }
        if (x === this.position.x && y === this.position.y) {
          char = "╒";
        }
        if (x === this.size.x - 1 && y === this.position.y) {
          char = "╕";
        }
        if (x === this.position.x && y === this.size.y - 1) {
          char = "╰";
        }
        if (x === this.size.x - 1 && y === this.size.y - 1) {
          char = "╯";
        }

        this.printAt(colors["bgBlack"](char), { x, y });
      }
    }

    const width = this.size.x - this.position.x - 2;
    const maxEntries = this.size.y - this.position.y - 2;

    const messagesByLine: string[] = this.logger
      .get("error")
      .map((entry, index) => `${index}. ${entry.message}`)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce(
        (accumulator: string[], line) => [
          ...accumulator,
          ...this.chunkString(line, width),
        ],
        [],
      );

    this.pages = this.chunkArray(messagesByLine, maxEntries);
    this.errors = this.logger.get("error").length;

    if (messagesByLine.length === 0) {
      this.printAt(this.stylizeText("No errors!"), {
        x: this.position.x + 1,
        y: this.position.y + 1,
      });
    }

    for (const [index, entry] of this.pages[this.actualPage!]!.entries()) {
      this.printAt(this.stylizeText(entry, "error"), {
        x: this.position.x + 1,
        y: this.position.y + 1 + index,
      });
    }

    this.printHeader();
  }

  private printHeader(): void {
    const titleText = " Errors ";
    this.printAt(this.stylizeText(titleText), {
      x: Math.floor((this.size.x + titleText.length / 2) / 2) - this.position.x,
      y: this.position.y,
    });

    const rightText = ` ${this.errors} errors | Page ${this.actualPage + 1}/${this.pages.length} `;

    this.printAt(this.stylizeText(rightText), {
      x: Math.floor(this.size.x + this.position.x - 4 - (rightText.length + 2)),
      y: this.position.y,
    });
  }

  private stylizeText(
    text: string,
    style: "normal" | "error" = "normal",
  ): string {
    const styles = { normal: "white", error: "red" };
    const color = styles[style];
    return ColorFn(color)(colors["bgBlack"](text));
  }

  private chunkString(string_: string, length: number): string[] {
    const matches = string_.match(new RegExp(`.{1,${length}}`, "g"));
    return matches === null ? [] : [...matches];
  }

  private chunkArray(array: string[], size: number): string[][] {
    return array.length > size
      ? [array.slice(0, size), ...this.chunkArray(array.slice(size), size)]
      : [array];
  }

  private calculatePosition(): void {
    const posX = 5;
    const posY = 4;
    this.setPosition({ x: posX, y: posY }, false);
    this.size = {
      x: this.terminal.columns - posX,
      y: this.terminal.rows - 3,
    };
  }
}
