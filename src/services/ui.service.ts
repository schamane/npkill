import ansiEscapes from "ansi-escapes";
import { Position, BaseUi } from "@/ui/base.ui.js";

const { stdin, stdout } = process;
const stdPrint = stdout.write.bind(stdout);

export class UiService {
  uiComponents: BaseUi[] = [];

  setRawMode(set = true) {
    stdin.setRawMode(set);
    stdin.resume();
  }

  setCursorVisible(visible: boolean) {
    const instruction = visible
      ? ansiEscapes.cursorShow
      : ansiEscapes.cursorHide;
    this.print(instruction);
  }

  add(component: BaseUi) {
    this.uiComponents = [...this.uiComponents, component];
  }

  renderAll() {
    this.clear();
    for (const component of this.uiComponents.filter(
      ({ visible }) => visible,
    )) {
      component.render();
    }
  }

  clear() {
    this.print(ansiEscapes.clearTerminal);
  }

  print(text: string) {
    stdPrint(text);
  }

  printAt(message: string, position: Position) {
    this.setCursorAt(position);
    this.print(message);
  }

  setCursorAt({ x, y }: Position) {
    this.print(ansiEscapes.cursorTo(x, y));
  }

  clearLine(row: number) {
    this.printAt(ansiEscapes.eraseLine, { x: 0, y: row });
  }
}
