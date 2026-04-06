import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { MailChannels } = await jiti.import("../../src/mailchannels");

const baseUrl = process.env.MAILCHANNELS_SIMULATOR_URL || "http://127.0.0.1:8787";
const apiKey = process.env.MAILCHANNELS_SIMULATOR_API_KEY || "local-test-key";
const webhookEndpoint = process.env.MAILCHANNELS_SIMULATOR_WEBHOOK || "http://127.0.0.1:9999/webhooks/mailchannels";

const mailchannels = new MailChannels(apiKey, { baseUrl });

const dkimKeyResult = await mailchannels.emails.createDkimKey("example.com", {
  selector: "local-demo"
});

if (dkimKeyResult.error) {
  throw new Error(`Failed to create DKIM key: ${dkimKeyResult.error.message}`);
}

const enrollResult = await mailchannels.webhooks.enroll(webhookEndpoint);

if (enrollResult.error || !enrollResult.success) {
  throw new Error(enrollResult.error?.message || "Failed to enroll webhook against simulator.");
}

const sendResult = await mailchannels.emails.send({
  campaignId: "simulator-demo",
  dkim: {
    domain: "example.com",
    selector: "local-demo"
  },
  from: "Simulator Demo <sender@example.com>",
  html: "<p>Hello {{name}}, this was sent through the local simulator.</p>",
  personalizations: [{
    mustaches: {
      name: "Local Developer"
    },
    subject: "MailChannels simulator example",
    to: "developer@example.com"
  }],
  subject: "MailChannels simulator example"
});

if (sendResult.error || !sendResult.success || !sendResult.data) {
  throw new Error(sendResult.error?.message || "Failed to send email through simulator.");
}

const batchesResult = await mailchannels.webhooks.batches({
  limit: 5,
  statuses: ["2xx"]
});

if (batchesResult.error) {
  throw new Error(`Failed to list webhook batches: ${batchesResult.error.message}`);
}

console.info(JSON.stringify({
  baseUrl,
  requestId: sendResult.data.requestId,
  messageId: sendResult.data.results[0]?.messageId || null,
  webhookEndpoint,
  webhookBatchCount: batchesResult.data?.length || 0,
  webhookStatus: batchesResult.data?.[0]?.status || null
}, null, 2));
