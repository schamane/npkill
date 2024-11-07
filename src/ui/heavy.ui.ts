import { BaseUi } from "./base.ui.js";
import { Buffer } from "node:buffer";

/**
 * A UI that buffers the output and prints it all at once when calling the
 * flush() function.
 */
export abstract class HeavyUi extends BaseUi {
  private buffer = Buffer.alloc(0);
  private previousBuffer = Buffer.alloc(0);

  /**
   * Stores the text in a buffer. No will print it to stdout until flush()
   * is called.
   */
  protected override print(text: string): void {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(text)]);
  }

  /** Prints the buffer (if have any change) to stdout and clears it. */
  protected flush(): void {
    if (this.freezed) {
      return;
    }

    if (this.buffer.equals(this.previousBuffer)) {
      this.clearBuffer();
      return;
    }

    process.stdout.write.bind(process.stdout)(this.buffer);
    this.clearBuffer();
  }

  private clearBuffer(): void {
    this.previousBuffer = Buffer.from(this.buffer);
    this.buffer = Buffer.alloc(0);
  }
}
