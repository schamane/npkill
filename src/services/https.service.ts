import https from "node:https";
import { Buffer } from "node:buffer";
import { Url } from "node:url";
import { IncomingMessage } from "node:http";
export class HttpsService {
  async getJson<T>(url: string | Url): Promise<T> {
    return new Promise((resolve, reject) => {
      const body: any[] = [];

      const req = https.get(url, (res) => {
        res.on("data", (chunk) => {
          body.push(Buffer.from(chunk));
        });
        res.on("end", () => {
          if (!this.isCorrectResponse(res)) {
            reject(res.statusMessage ?? "Unknown error");
            return;
          }
          let data = Buffer.concat(body).toString();
          try {
            data = JSON.parse(data);
          } catch {
            // nothing
          } finally {
            resolve(data as T);
          }
        });
      });

      req.on("error", reject);

      req.end();
    });
  }

  private isCorrectResponse({ statusCode = 500 }: IncomingMessage): boolean {
    return statusCode >= 200 && statusCode <= 299;
  }
}
