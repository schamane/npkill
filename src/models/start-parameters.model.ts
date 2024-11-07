const store = new Map<string, string | boolean>();

// TODO: probably can be static
// TODO: no need to wrap Map to extra class

export class StartParameters {
  add(key: string, value: string | boolean): void {
    store.set(key, value);
  }

  isTrue(key: string) {
    return store.has(key);
  }

  getString(key: string) {
    const value = store.get(key);
    if (typeof value === "boolean") {
      return value.toString();
    }

    return value ?? "";
  }

  reset() {
    store.clear();
  }
}
