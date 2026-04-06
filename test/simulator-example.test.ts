import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmailApiSimulator } from "../scripts/email-api-simulator.js";

type EmailApiSimulator = {
  close: () => Promise<void>;
  listen: (listenOptions?: { host?: string, port?: number }) => Promise<string | null>;
};

const execFileAsync = promisify(execFile);

describe("simulator example script", () => {
  let baseUrl = "";
  let simulator: EmailApiSimulator;

  beforeAll(async () => {
    simulator = createEmailApiSimulator({
      logRequests: false,
      port: 0
    });

    const simulatorUrl = await simulator.listen();
    if (!simulatorUrl) {
      throw new Error("Expected the email API simulator example test to get a listening URL.");
    }

    baseUrl = simulatorUrl;
  });

  afterAll(async () => {
    await simulator.close();
  });

  it("should run the documented simulator example successfully", async () => {
    const { stdout } = await execFileAsync(process.execPath, ["playground/simulator/send.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MAILCHANNELS_SIMULATOR_API_KEY: "example-script-key",
        MAILCHANNELS_SIMULATOR_URL: baseUrl
      }
    });

    const result = JSON.parse(stdout) as {
      baseUrl: string;
      messageId: string | null;
      requestId: string;
      webhookBatchCount: number;
      webhookStatus: string | null;
    };

    expect(result.baseUrl).toBe(baseUrl);
    expect(result.requestId).toMatch(/^request_/);
    expect(result.messageId).toContain("@simulator.mailchannels.local");
    expect(result.webhookBatchCount).toBeGreaterThan(0);
    expect(result.webhookStatus).toBe("2xx_response");
  });
});
