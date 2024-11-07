import { BaseUi } from "@/ui/base.ui.js";
import colors from "colors";
import { SpinnerService } from "../../../services/spinner.service.js";
import { INFO_MSGS } from "../../../constants/messages.constants.js";
import {
  SPINNERS,
  SPINNER_INTERVAL,
} from "../../../constants/spinner.constants.js";
import { UI_POSITIONS } from "../../../constants/main.constants.js";
import { SearchStatus } from "../../../models/search-state.model.js";
import { BAR_PARTS, BAR_WIDTH } from "../../../constants/status.constants.js";

const proportional = (a: number, b: number, c: number): number =>
  c === 0 ? 0 : (a * b) / c;
const PENDING_TASK_LENGHT = 17;

const PendingTasksPosition = UI_POSITIONS.PENDING_TASKS;

export class StatusUi extends BaseUi {
  private text = "";
  private barNormalizedWidth = 0;
  private barClosing = false;
  private showProgressBar = true;
  private animationInterval: NodeJS.Timeout | undefined;
  private readonly SEARCH_STATES = {
    stopped: () => this.startingSearch(),
    scanning: () => this.continueSearching(),
    dead: () => this.fatalError(),
    finished: () => this.continueFinishing(),
  };

  constructor(
    private readonly spinnerService: SpinnerService,
    private readonly searchStatus: SearchStatus,
  ) {
    super();
  }

  start(): void {
    const states = this.SEARCH_STATES;
    const workerStatus = this.searchStatus;
    this.spinnerService.setSpinner(SPINNERS.W10);
    this.animationInterval = setInterval(() => {
      states[workerStatus.workerStatus]();
    }, 250);
    this.animateProgressBar();
  }

  completeSearch(duration: number): void {
    clearInterval(this.animationInterval);

    this.text = `${colors.green(INFO_MSGS.SEARCH_COMPLETED)}${colors.gray(`${duration}s`)}`;
    this.render();
    setTimeout(() => this.animateClose(), 2000);
  }

  render(): void {
    this.printAt(this.text, UI_POSITIONS.STATUS);

    if (this.showProgressBar) {
      this.renderProgressBar();
    }

    this.renderPendingTasks();
  }

  private renderPendingTasks(): void {
    this.clearPendingTasks();
    if (this.searchStatus.pendingDeletions === 0) {
      return;
    }

    const { pendingDeletions } = this.searchStatus;
    const text = pendingDeletions > 1 ? "pending tasks" : "pending task ";
    this.printAt(
      colors.yellow(`${pendingDeletions} ${text}`),
      PendingTasksPosition,
    );
  }

  private clearPendingTasks(): void {
    this.printAt(" ".repeat(PENDING_TASK_LENGHT), PendingTasksPosition);
  }

  private renderProgressBar(): void {
    const {
      pendingSearchTasks,
      completedSearchTasks,
      completedStatsCalculation,
      pendingStatsCalculation,
    } = this.searchStatus;
    const barSearchMax = pendingSearchTasks + completedSearchTasks;
    const barStatsMax = pendingStatsCalculation + completedStatsCalculation;

    const modifier =
      this.barNormalizedWidth === 1
        ? 1
        : // easeInOut formula
          -(Math.cos(Math.PI * this.barNormalizedWidth) - 1) / 2;

    const searchBarLenght = Math.ceil(
      proportional(completedSearchTasks, BAR_WIDTH, barSearchMax) * modifier,
    );

    const doneBarLenght = Math.floor(
      proportional(completedStatsCalculation, searchBarLenght, barStatsMax) *
        modifier,
    );

    const barLenght = Math.ceil(BAR_WIDTH * modifier);

    // Debug
    /*
    this.printAt(`V: ${barSearchMax},T: ${barLenghtOrig - searchBarLenght},C: ${searchBarLenght - doneBarLenght},D:${doneBarLenght}   `, {
      x: 80,
      y: 6
    });
    */
    const progressBar = [
      BAR_PARTS.completed.repeat(doneBarLenght),
      BAR_PARTS.searchTask.repeat(searchBarLenght - doneBarLenght),
      BAR_PARTS.bg.repeat(barLenght - searchBarLenght),
    ].join("");

    this.printProgressBar(progressBar);
  }

  private animateProgressBar(): void {
    this.barClosing = false;
    const interval = setInterval(() => {
      this.barNormalizedWidth += 0.05;
      if (this.barNormalizedWidth > 1) {
        this.barNormalizedWidth = 1;
        clearInterval(interval);
      }
      this.renderProgressBar();
    }, SPINNER_INTERVAL);
  }

  private animateClose(): void {
    this.barClosing = true;
    const interval = setInterval(() => {
      this.barNormalizedWidth -= 0.05;
      if (this.barNormalizedWidth < 0) {
        this.barNormalizedWidth = 0;
        this.movePendingTaskToTop();

        clearInterval(interval);
      }
      this.renderProgressBar();
    }, SPINNER_INTERVAL);
  }

  /** When the progress bar disappears, "pending tasks" will move up one
      position. */
  private movePendingTaskToTop(): void {
    this.clearPendingTasks();
    this.renderPendingTasks();
  }

  private printProgressBar(progressBar: string) {
    if (!this.barClosing) {
      this.printAt(progressBar, UI_POSITIONS.STATUS_BAR);
      return;
    }
    const postX =
      UI_POSITIONS.STATUS_BAR.x -
      1 +
      Math.round((BAR_WIDTH / 2) * (1 - this.barNormalizedWidth));
    // Clear previus bar
    this.printAt(" ".repeat(BAR_WIDTH), UI_POSITIONS.STATUS_BAR);

    this.printAt(progressBar, {
      x: postX,
      y: UI_POSITIONS.STATUS_BAR.y,
    });
  }

  private startingSearch() {
    this.text = INFO_MSGS.STARTING;
    this.render();
  }

  private continueSearching() {
    this.text = `${INFO_MSGS.SEARCHING}${this.spinnerService.nextFrame()}`;
    this.render();
  }

  private fatalError(): void {
    this.text = colors.red(INFO_MSGS.FATAL_ERROR);
    clearInterval(this.animationInterval);
    this.render();
  }

  private continueFinishing(): void {
    this.text = `${INFO_MSGS.CALCULATING_STATS}${this.spinnerService.nextFrame()}`;
    this.render();
  }
}
