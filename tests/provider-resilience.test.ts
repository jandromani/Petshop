import { afterEach,describe,expect,it,vi } from "vitest";
import { fetchJson,ProviderHttpError } from "@/src/providers/live/common";

afterEach(()=>{
  vi.restoreAllMocks();
});

describe("provider HTTP resilience",()=>{
  it("retries a 429 once and returns the recovered payload",async()=>{
    const mocked=vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(new Response("busy",{status:429}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok:true}),{status:200,headers:{"content-type":"application/json"}}));

    await expect(fetchJson<{ok:boolean}>("example","https://provider.test",{},{
      retries:1,timeoutMs:1000,
    })).resolves.toEqual({ok:true});
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("retries transient 5xx then fails with typed provider evidence",async()=>{
    const mocked=vi.spyOn(globalThis,"fetch")
      .mockImplementation(async()=>new Response("upstream-down",{status:503}));

    const error=await fetchJson("example","https://provider.test",{},{
      retries:1,timeoutMs:1000,
    }).catch(value=>value);

    expect(mocked).toHaveBeenCalledTimes(2);
    expect(error).toBeInstanceOf(ProviderHttpError);
    if(!(error instanceof ProviderHttpError))throw error;
    expect(error.status).toBe(503);
    expect(error.provider).toBe("example");
    expect(error.responseText).toContain("upstream-down");
  });

  it("retries a network exception before succeeding",async()=>{
    const mocked=vi.spyOn(globalThis,"fetch")
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok:true}),{status:200}));

    await expect(fetchJson<{ok:boolean}>("example","https://provider.test",{},{
      retries:1,timeoutMs:1000,
    })).resolves.toEqual({ok:true});
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("aborts a hung provider at the configured timeout",async()=>{
    vi.spyOn(globalThis,"fetch").mockImplementation((_url,init)=>new Promise((_resolve,reject)=>{
      const signal=init?.signal;
      if(!signal)return reject(new Error("missing abort signal"));
      signal.addEventListener("abort",()=>reject(new Error("provider request aborted")),{once:true});
    }));

    await expect(fetchJson("example","https://provider.test",{},{
      retries:0,timeoutMs:10,
    })).rejects.toThrow("provider request aborted");
  });
});
