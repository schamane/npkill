export class SpinnerService {
  private spinner: string[] = [];
  private count = -1;

  setSpinner(spinner: string[]) {
    this.spinner = spinner;
    this.reset();
  }

  nextFrame() {
    this.updateCount();
    return this.spinner[this.count] ?? "";
  }

  reset() {
    this.count = -1;
  }

  private updateCount() {
    if (this.isLastFrame()) {
      this.count = 0;
    } else {
      ++this.count;
    }
  }

  private isLastFrame() {
    return this.count === this.spinner.length - 1;
  }
}
