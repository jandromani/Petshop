import { afterEach,describe,expect,it,vi } from "vitest";
import { operationalAlertWebhook,sendOperationalAlerts } from "@/src/system/alerts";

const original=process.env.OPS_ALERT_WEBHOOK_URL;
afterEach(()=>{
  vi.restoreAllMocks();
  if(original===undefined)delete process.env.OPS_ALERT_WEBHOOK_URL;
  else process.env.OPS_ALERT_WEBHOOK_URL=original;
});

describe("operational alert delivery",()=>{
  it("fails closed when destination is absent or not HTTPS",()=>{
    delete process.env.OPS_ALERT_WEBHOOK_URL;
    expect(operationalAlertWebhook()).toBeNull();
    process.env.OPS_ALERT_WEBHOOK_URL="http://example.test/hook";
    expect(operationalAlertWebhook()).toBeNull();
  });

  it("sends only warning/critical operational facts to configured destination",async()=>{
    process.env.OPS_ALERT_WEBHOOK_URL="https://alerts.example.test/atlas";
    const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(null,{status:204}));
    const result=await sendOperationalAlerts([
      {key:"infra.database",severity:"critical",message:"Database unreachable"},
      {key:"supply.live",severity:"warning",message:"No live supply"},
    ]);
    expect(result).toMatchObject({configured:true,sent:true,count:2,status:204});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [,init]=fetchMock.mock.calls[0];
    const body=JSON.parse(String(init?.body||"{}"));
    expect(body.highestSeverity).toBe("critical");
    expect(body.signals).toHaveLength(2);
  });

  it("does not call the webhook when there is nothing actionable",async()=>{
    process.env.OPS_ALERT_WEBHOOK_URL="https://alerts.example.test/atlas";
    const fetchMock=vi.spyOn(globalThis,"fetch");
    await expect(sendOperationalAlerts([])).resolves.toMatchObject({configured:true,sent:false,count:0});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports delivery failure without throwing the control workflow",async()=>{
    process.env.OPS_ALERT_WEBHOOK_URL="https://alerts.example.test/atlas";
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("down",{status:503}));
    await expect(sendOperationalAlerts([
      {key:"x",severity:"warning",message:"degraded"},
    ])).resolves.toMatchObject({configured:true,sent:false,status:503});
  });
});
