import { test,expect } from "@playwright/test";
test("Spanish search compares hotels and preserves dates, guests and budget into a request",async({page})=>{
 let submission:any;
 await page.route("**/api/sourcing",async route=>{submission=route.request().postDataJSON();await route.fulfill({status:202,json:{ok:true,id:"11111111-1111-4111-8111-111111111111",status:"SOURCING",notification:"ops-queue"}})});
 await page.goto("/es/stays?q=Madrid&checkIn=2027-02-01&duration=60&occupancy=2&maxMonthly=2300");
 await expect(page.locator("html")).toHaveAttribute("lang","es");
 await expect(page.getByLabel("Destino u hotel")).toHaveValue("Madrid");
 const cards=page.locator(".realHotelCard");await expect(cards.first()).toBeVisible();
 await cards.nth(0).getByRole("button",{name:"Comparar",exact:true}).click();await cards.nth(1).getByRole("button",{name:"Comparar",exact:true}).click();
 await page.getByRole("link",{name:"Comparar hoteles →",exact:true}).click();
 await expect(page.locator(".comparisonCard")).toHaveCount(2);await expect(page.locator(".comparisonCard").first()).toContainText("60 noches · 2 huéspedes");
 await page.locator(".comparisonCard").first().getByRole("link",{name:"Consultar hotel →"}).click();
 const form=page.locator(".sourceStay");await expect(form.getByLabel("Entrada",{exact:true})).toHaveValue("2027-02-01");await expect(form.getByLabel("Estancia",{exact:true})).toHaveValue("60");await expect(form.getByLabel("Huéspedes",{exact:true})).toHaveValue("2");await expect(form.getByLabel("Presupuesto €/30 noches")).toHaveValue("2300");
 await form.getByLabel("Email para el presupuesto").fill("qa@example.com");await form.getByRole("checkbox").check();await form.getByRole("button",{name:"Solicitar tarifa para mi estancia →"}).click();
 await expect(form.getByRole("status")).toContainText("Hemos recibido tus fechas.");expect(submission).toMatchObject({checkIn:"2027-02-01",nights:60,occupancy:2,targetMonthlyEur:2300,language:"es",contactConsent:true});expect(submission.sourcePath).not.toContain("?");
 await page.route("**/api/requests",route=>route.fulfill({json:{requests:[]}}));await form.getByRole("link",{name:"Seguir mi solicitud →"}).click();await expect(page).toHaveURL(/\/es\/requests/);await expect(page.getByRole("heading",{name:"Sigue tu próxima temporada."})).toBeVisible();
});
test("Spanish destination pages have reciprocal language links and working search CTAs",async({page})=>{
 await page.goto("/es/monthly-stays/tenerife");await expect(page.locator("html")).toHaveAttribute("lang","es");await expect(page.locator("h1")).toContainText("Tenerife");
 await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href",/\/monthly-stays\/tenerife$/);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href",/\/es\/monthly-stays\/tenerife$/);
 const href=await page.locator('a[href^="/es/stays?"]').first().getAttribute("href");expect(href).toContain("duration=60");await page.locator('a[href^="/es/stays?"]').first().click();await expect(page.getByLabel("Duración de estancia")).toHaveValue("60");
});
test("private acquisition and customer data stay closed to anonymous visitors",async({request})=>{
 expect((await request.get("/growth-desk")).status()).toBe(404);expect((await request.get("/api/ops/acquisition-export")).status()).toBe(401);
 const response=await request.get("/api/requests");expect(response.headers()["cache-control"]).toContain("no-store");expect((await response.json()).requests).toEqual([]);
 const denied=await request.post("/api/share-search",{headers:{origin:"https://evil.test"},data:{query:"q=Madrid"}});expect(denied.status()).toBe(403);
});
test("shared search fallback removes contact and advertising tokens",async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,"share",{value:undefined,configurable:true});Object.defineProperty(navigator,"clipboard",{value:{writeText:async(text:string)=>{(window as any).__shareText=text}},configurable:true})});
 await page.route("**/api/share-search",route=>route.fulfill({status:503,json:{error:"unavailable"}}));
 await page.goto("/es/stays?q=Madrid&duration=60&email=private%40example.com&gclid=secret");await page.getByRole("button",{name:"Compartir búsqueda",exact:true}).click();await expect(page.getByText("Enlace copiado",{exact:true})).toBeVisible();
 const shared=await page.evaluate(()=>(window as any).__shareText);expect(shared).toContain("/es/stays?");expect(shared).toContain("duration=60");expect(shared).not.toContain("private");expect(shared).not.toContain("gclid");
});
test("Spanish mobile conversion pages do not overflow horizontally",async({page})=>{
 await page.setViewportSize({width:390,height:844});for(const path of ["/es","/es/monthly-stays/gran-canaria","/es/for-hotels","/es/requests"]){await page.goto(path);const size=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));expect(size.actual,path).toBeLessThanOrEqual(size.viewport+2)}
});
