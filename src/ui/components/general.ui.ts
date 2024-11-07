import { BaseUi } from "@/ui/base.ui.js";
import colors from "colors";

const gray = colors["gray"];
const thanks = gray(
  "Thanks for using npkill!\nLike it? Give us a star http://github.com/voidcosmos/npkill\n",
);

export class GeneralUi extends BaseUi {
  override render() {}
  printExitMessage = ({ spaceReleased }: { spaceReleased: string }) =>
    this.print(`Space released: ${spaceReleased}\n${thanks}`);
}
