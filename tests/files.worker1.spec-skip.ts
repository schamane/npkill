import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import EventEmitter from "node:events";
import { Dir } from "node:fs";
import { MessageChannel } from "node:worker_threads";
import { EVENTS } from "@/constants/workers.constants.js";
import worker from "@/services/files/files.worker.js";

let tunnelEmitter: MessagePort;

const mocks = vi.hoisted(() => ({
  mockDir: {
    read: () => {
      return mocks.dirEntriesMock.length > 0
        ? Promise.resolve(mocks.dirEntriesMock.shift())
        : Promise.resolve();
    },
    close: () => {},
  } as unknown as Dir,
  tunnelPostMock: vi.fn(),
  dirEntriesMock: [] as { name: string; isDirectory: () => void }[],
  // eslint-disable-next-line unicorn/prefer-event-target
  parentEmitter: new EventEmitter(),
}));

vi.mock("fs/promises", async (originalImport) => {
  const original = await originalImport<typeof import("fs/promises")>();
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    opendir: (_path: string) => Promise.resolve(mocks.mockDir),
  };
});

vi.mock("node:worker_threads", async (originalImport) => {
  const original = await originalImport<typeof import("node:worker_threads")>();
  return {
    ...original,
    parentPort: {
      ...original.parentPort,
      postMessage: mocks.tunnelPostMock,
      on: (eventName: string, listener: (...args: any[]) => void) => {
        console.log(" --- do subscribe parentEmoter ---");
        return mocks.parentEmitter.on(eventName, (...args: any[]) => {
          console.log("on", eventName, ...args);
          listener(...args);
        });
      },
    },
  };
});

describe("FileWorker", () => {
  beforeEach(async () => {
    const { port1, port2 } = new MessageChannel();
    mocks.tunnelEmitter = port1;

    mocks.parentEmitter.emit("message", {
      type: EVENTS.startup,
      value: { channel: port2 },
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mocks.parentEmitter.removeAllListeners();
    mocks.tunnelEmitter.close();
  });

  // it('should plant a listener over the passed MessagePort',()=>{})

  it("eventing can be used for tests", async () => {
    const done = new Promise((resolve) => {
      console.log("Subscribe");
      mocks.tunnelEmitter.on("message", (message) => {
        console.log("CATCH MESSAGE", message);
        if (message.type === EVENTS.explore) {
          resolve(message.value.results);
        }
      });
    });

    mocks.parentEmitter.on("message", console.log);

    console.log("emit");
    mocks.tunnelEmitter.postMessage({
      type: EVENTS.explore,
      value: { path: "/home/user/" },
    });
    console.log("await start", mocks.tunnelEmitter.postMessage);
    expect(mocks.tunnelPostMock).toBeCalledTimes(1);
    const result = await done;
    console.log("emit done");
    expect(mocks.tunnelPostMock).toBeCalledTimes(2);
    console.log("RESULT", result);

    expect(result).toHaveResolved();
    console.log("DONE TEST");
  });
});
