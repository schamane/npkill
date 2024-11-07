import { signal, computed, effect } from "@preact/signals-core";

class Test {
  private counter = signal(0);

  private text = computed(() => `current value: ${this.counter.value}`);

  private interval: NodeJS.Timeout | undefined = undefined;

  constructor() {
    effect(() => console.log(this.text.value));
  }

  public tick() {
    this.interval = setInterval(() => {
      this.counter.value += 1;
    }, 600);
  }
}

const t = new Test();
console.log("init");
t.tick();
console.log("started tick");
