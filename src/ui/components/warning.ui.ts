import { InteractiveUi, BaseUi } from "../base.ui.js";
import { IKeyPress } from "@/interfaces/key-press.interface.js";
import { UI_POSITIONS } from "@/constants/main.constants.js";
import { INFO_MSGS } from "@/constants/messages.constants.js";
import { signal } from "@preact/signals-core";

export class WarningUi extends BaseUi implements InteractiveUi {
  private showDeleteAllWarning = false;
  readonly confirm$ = signal<boolean>(false);

  private readonly KEYS: Record<string, () => void> = {
    y: () => (this.confirm$.value = true),
  } as const;

  onKeyInput({ name }: IKeyPress): void {
    const action = this.KEYS[name];
    if (action === undefined) {
      return;
    }
    action();
  }

  setDeleteAllWarningVisibility(visible: boolean): void {
    this.showDeleteAllWarning = visible;
    this.render();
  }

  render(): void {
    if (this.showDeleteAllWarning) {
      this.printDeleteAllWarning();
    }
  }

  private printDeleteAllWarning(): void {
    this.printAt(INFO_MSGS.DELETE_ALL_WARNING, UI_POSITIONS.WARNINGS);
  }
}
