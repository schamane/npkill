import { IKeyPress } from "@/interfaces/key-press.interface.js";
import ansiEscapes from "ansi-escapes";

export interface Position {
  x: number;
  y: number;
}

export interface InteractiveUi {
  onKeyInput: (key: IKeyPress) => void;
}

export abstract class BaseUi {
  public freezed = false;
  private positionValue: Position = { x: 0, y: 0 };
  protected visibleValue = true;
  private readonly stdout: NodeJS.WriteStream = process.stdout;

  protected printAt(message: string, position: Position) {
    this.setCursorAt(position);
    this.print(message);
  }

  protected setCursorAt({ x, y }: Position) {
    this.print(ansiEscapes.cursorTo(x, y));
  }

  protected print(text: string) {
    if (this.freezed) {
      return;
    }
    this.stdout.write(text);
  }

  protected clearLine(row: number) {
    this.printAt(ansiEscapes.eraseLine, { x: 0, y: row });
  }

  setPosition(position: Position, renderOnSet = true) {
    this.positionValue = position;

    if (renderOnSet) {
      this.render();
    }
  }

  setVisible(visible: boolean, renderOnSet = true) {
    this.visibleValue = visible;

    if (renderOnSet) {
      this.render();
    }
  }

  get position() {
    return this.positionValue;
  }

  get visible() {
    return this.visibleValue;
  }

  get terminal(): { columns: number; rows: number } {
    return {
      columns: this.stdout.columns,
      rows: this.stdout.rows,
    };
  }

  abstract render(): void;
}
