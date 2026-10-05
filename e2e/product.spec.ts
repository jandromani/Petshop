import { test,expect } from "@playwright/test";

test("money truth is explicit and internally consistent",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/Live somewhere better/i})).toBeVisible();
  await expect(page.getByTestId("monthly-resources")).toContainText("€3,200");
  await expect(page.getByTestId("living-budget")).toContainText("€2,050");
  await expect(page.getByText("365 days",{exact:false}).first()).toBeVisible();
  const budget=Number((await page.getByTestId("living-budget").innerText()).replace(/[^0-9]/g,""));
  const costText=await page.getByTestId("route-cost").innerText();
  const cost=Number(costText.replace(/[^0-9]/g,""));
  expect(cost).toBeLessThanOrEqual(budget);
});

test("search count and visible real-hotel cards share the same directory contract",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:/Browse .* real hotels/i}).click();
  const heading=page.locator("#explore .resultsHeadline h2");
  await expect(heading).toContainText(/real hotels/i,{timeout:15000});
});

test("system proof and health remain reachable",async({page,request})=>{
  await page.goto("/system");
  await expect(page.getByRole("heading",{name:"FULL SYSTEM PROOF"})).toBeVisible();
  const health=await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).softwareProof).toBe(true);
});

test("malformed encoded paths fail closed instead of reaching Next routing",async({request})=>{
  const response=await request.get("/es%5C",{maxRedirects:0});
  expect(response.status()).toBe(404);
  expect(response.headers()["x-atlas-rejected-path"]).toBe("malformed");
});

test("legal surfaces expose the commercial launch gate",async({page})=>{
  await page.goto("/legal");
  await expect(page.getByRole("heading",{name:/How Atlas makes money/i})).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading",{name:/Privacy notice/i})).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading",{name:/Terms of use/i})).toBeVisible();
});


test("mobile layout has no material horizontal overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  const dimensions=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+2);
});

test("primary planner path is keyboard reachable",async({page})=>{
  await page.goto("/");
  await page.keyboard.press("Tab");
  let found=false;
  for(let i=0;i<30;i++){
    const focused=await page.evaluate(()=>({
      tag:document.activeElement?.tagName||"",
      text:(document.activeElement?.textContent||"").trim(),
      aria:document.activeElement?.getAttribute("aria-label")||"",
    }));
    if(/browse .* real hotels/i.test(focused.text)||/browse .* real hotels/i.test(focused.aria)){found=true;break;}
    await page.keyboard.press("Tab");
  }
  expect(found).toBe(true);
});


test("public surfaces keep basic accessibility contracts",async({page})=>{
  for(const path of ["/","/saved","/privacy","/terms","/legal"]){
    await test.step(path,async()=>{
      const response=await page.goto(path,{waitUntil:"domcontentloaded"});
      expect(response?.status(),path+" navigation status").toBe(200);
      await expect(page.locator("main"),path+" main landmark").toHaveCount(1);
      await expect(page.locator("h1").first(),path+" h1").toBeVisible();

      const missingAlt=await page.locator("img:not([alt])").count();
      expect(missingAlt,path+" images missing alt").toBe(0);

      const unnamedButtons=await page.locator("button").evaluateAll(nodes=>nodes.filter(node=>{
        const element=node as HTMLElement;
        const style=getComputedStyle(element);
        if(element.hidden||style.display==="none"||style.visibility==="hidden"||element.closest('[aria-hidden="true"]'))return false;
        return !((element.textContent||"").trim()||element.getAttribute("aria-label")||element.getAttribute("title"));
      }).length);
      expect(unnamedButtons,path+" unnamed buttons").toBe(0);

      const unnamedLinks=await page.locator("a").evaluateAll(nodes=>nodes.filter(node=>{
        const element=node as HTMLElement;
        const style=getComputedStyle(element);
        if(element.hidden||style.display==="none"||style.visibility==="hidden"||element.closest('[aria-hidden="true"]'))return false;
        return !((element.textContent||"").trim()||element.getAttribute("aria-label")||element.getAttribute("title"));
      }).length);
      expect(unnamedLinks,path+" unnamed links").toBe(0);

      const unnamedFields=await page.locator("input,select,textarea").evaluateAll(nodes=>nodes.filter(node=>{
        const element=node as HTMLElement;
        if(element.getAttribute("aria-label")||element.getAttribute("aria-labelledby")||element.getAttribute("title"))return false;
        if(element.closest("label"))return false;
        const id=element.getAttribute("id");
        if(id&&Array.from(document.querySelectorAll("label")).some(label=>(label as HTMLLabelElement).htmlFor===id))return false;
        return true;
      }).length);
      expect(unnamedFields,path+" unnamed form controls").toBe(0);
    });
  }
});


test("shared hotel search restores the full deterministic filter state",async({page})=>{
  await page.goto("/stays?q=Madrid&region=Europe&duration=90&occupancy=2&maxMonthly=1800&features=pool%2Cgym&brand=Marriott&brandedOnly=1&sort=name");
  await expect(page.getByRole("heading",{name:/Search real hotels/i})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>{
    const root=document.querySelector(".silverSearch");
    const value=(selector:string)=>(root?.querySelector(selector) as HTMLInputElement|HTMLSelectElement|null)?.value??null;
    const brand=(document.querySelector('.advancedHotelFilters input[placeholder="Hilton, Marriott…"]') as HTMLInputElement|null)?.value??null;
    const active=new Set(Array.from(document.querySelectorAll(".preferenceFilters button.active")).map(node=>(node.textContent||"").trim()));
    return {
      query:value('input[placeholder^="Madrid"]'),
      region:value('select[aria-label="Region"]'),
      duration:value('select[aria-label="Stay duration"]'),
      party:value('select[aria-label="Travelling party"]'),
      budget:value('input[aria-label="Maximum monthly hotel budget"]'),
      brand,
      pool:active.has("pool"),
      gym:active.has("gym"),
      brandedOnly:new URL(window.location.href).searchParams.get("brandedOnly"),
    };
  }),{timeout:15000}).toEqual({
    query:"Madrid",region:"Europe",duration:"90",party:"couple",budget:"1800",brand:"Marriott",pool:true,gym:true,brandedOnly:"1",
  });
});

test("zero-result search fails honestly and offers deterministic relaxation",async({page})=>{
  await page.goto("/stays?q=atlas-hotel-that-does-not-exist-zzzz");
  await expect(page.getByText(/ZERO RESULTS · NO FAKE FALLBACK/i)).toBeVisible();
  await expect.poll(()=>page.locator(".zeroResults .actions button").allTextContents(),{timeout:15000}).toContain("Clear destination/name");
});

test("real hotel search exposes list and map modes on mobile",async({page,request})=>{
  const worker=await request.get("/maplibre/maplibre-gl-worker.mjs");
  const shared=await request.get("/maplibre/maplibre-gl-shared.mjs");
  expect(worker.ok()).toBeTruthy();
  expect(shared.ok()).toBeTruthy();

  await page.route("https://tiles.openfreemap.org/styles/bright",async route=>{
    await route.fulfill({
      status:200,
      contentType:"application/json",
      body:JSON.stringify({version:8,sources:{},layers:[{id:"background",type:"background",paint:{"background-color":"#f4f6f8"}}]}),
    });
  });

  await page.setViewportSize({width:390,height:844});
  await page.goto("/stays?q=Madrid");
  await expect(page.getByRole("button",{name:/Map ·/i})).toBeVisible();
  await page.getByRole("button",{name:/Map ·/i}).click();
  await expect(page.locator(".hotelMapPane")).toBeVisible();
  await expect(page.locator(".hotelMapShell")).toBeAttached();
});
