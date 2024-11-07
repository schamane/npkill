/* eslint-disable unicorn/prefer-event-target */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { HttpsService } from "@/services/https.service.js";

class OwnEmitter extends EventEmitter {
  end = vi.fn();
}

const responseEmitter = new EventEmitter();
const requestEmiter = new OwnEmitter();

let status: number;

const mocks = vi.hoisted(() => {
  const response = () => {
    return {
      get statusCode() {
        return status;
      },
      setEncoding: vi.fn(),
      on: (eventName: string, listener: (...args: unknown[]) => void) =>
        responseEmitter.on(eventName, listener),
    };
  };

  const get = vi
    .fn()
    .mockImplementation((_: string, cb: (...args: unknown[]) => void) => {
      cb(response());
      return requestEmiter;
    });
  return { get };
});

vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  return {
    default: {
      ...actual,
      get: mocks.get,
    },
  };
});

describe("Http Service", () => {
  let httpsService: HttpsService;
  beforeEach(() => {
    httpsService = new HttpsService();
    status = 200;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should match requested object ", async () => {
    const data = httpsService.getJson("https://sampleUrl");
    responseEmitter.emit("data", JSON.stringify({ msg: "ok" }));
    responseEmitter.emit("end");

    expect(mocks.get).toBeCalledTimes(1);
    expect(data).resolves.toMatchObject({ msg: "ok" });
  });

  it("should reject if a error ocurr", () => {
    const data = httpsService.getJson("https://sampleUrl");
    requestEmiter.emit("error", "test error1");

    //expect(mocks.get).toBeCalledTimes(1);
    expect(data).rejects.toThrowError(/test error1/);
  });

  it("should reject if the code of the response indicate error (101)", async () => {
    status = 101;
    const data = httpsService.getJson("https://sampleUrl");
    responseEmitter.emit("end");
    expect(data).rejects.toThrowError(/Unknown error/);
  });

  it("should reject if the code of the response indicate error (404)", async () => {
    status = 404;
    const data = httpsService.getJson("https://sampleUrl");
    responseEmitter.emit("end");
    expect(data).rejects.toThrowError(/Unknown error/);
  });

  it("should resolve with all chunks of data on end", async () => {
    const chunks = ['{"key1"', ':"test","ke', 'y2":"p', 'assed"}'];
    const expected = {
      key1: "test",
      key2: "passed",
    };

    // const data = httpsService.getJson('https://sampleUrl');
    // expect(data).resolves.toMatchObject(expected);
    expect(httpsService.getJson("https://sampleUrl")).resolves.toMatchObject(
      expected,
    );

    for (const chunk of chunks) responseEmitter.emit("data", chunk);
    responseEmitter.emit("end");
  });
});
