import { test,expect } from "@playwright/test";

test("lab performance budget stays within bounded FCP LCP CLS and DOM size",async({page},testInfo)=>{
  test.skip(!["chromium","mobile"].includes(testInfo.project.name),"PerformanceObserver contract runs on Chromium engines.");

  await page.addInitScript(()=>{
    const state={cls:0,lcp:0};
    (window as typeof window & {__atlasPerf?:typeof state}).__atlasPerf=state;
    try{
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries() as Array<PerformanceEntry & {value?:number;hadRecentInput?:boolean}>){
          if(!entry.hadRecentInput&&typeof entry.value==="number")state.cls+=entry.value;
        }
      }).observe({type:"layout-shift",buffered:true});
    }catch{}
    try{
      new PerformanceObserver(list=>{
        const entries=list.getEntries();
        const last=entries.at(-1);
        if(last)state.lcp=last.startTime;
      }).observe({type:"largest-contentful-paint",buffered:true});
    }catch{}
  });

  const response=await page.goto("/",{waitUntil:"load"});
  expect(response?.status()).toBe(200);
  await page.waitForTimeout(500);

  const metrics=await page.evaluate(()=>{
    const state=(window as typeof window & {__atlasPerf?:{cls:number;lcp:number}}).__atlasPerf||{cls:0,lcp:0};
    const fcp=performance.getEntriesByName("first-contentful-paint")[0]?.startTime||0;
    return{
      fcp,
      lcp:state.lcp,
      cls:state.cls,
      domNodes:document.getElementsByTagName("*").length,
    };
  });

  expect(metrics.fcp,"lab FCP ms").toBeGreaterThan(0);
  expect(metrics.fcp,"lab FCP ms").toBeLessThanOrEqual(testInfo.project.name==="mobile"?4500:3500);
  if(metrics.lcp>0)expect(metrics.lcp,"lab LCP ms").toBeLessThanOrEqual(testInfo.project.name==="mobile"?5500:4500);
  expect(metrics.cls,"lab CLS").toBeLessThanOrEqual(.15);
  expect(metrics.domNodes,"homepage DOM nodes").toBeLessThanOrEqual(3000);
});

test("public health read path tolerates a small concurrent burst",async({request},testInfo)=>{
  test.skip(testInfo.project.name!=="chromium","Run the load smoke once per CI matrix.");
  const responses=await Promise.all(Array.from({length:20},()=>request.get("/api/health")));
  expect(responses.every(response=>response.status()===200)).toBe(true);
  const payloads=await Promise.all(responses.map(response=>response.json()));
  expect(payloads.every(payload=>payload.softwareProof===true)).toBe(true);
});
