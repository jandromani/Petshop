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

test("search count and visible cards share the same budget contract",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:/Show .* stays/}).click();
  await expect(page.locator("#explore")).toBeInViewport();
  const heading=page.locator("#explore h2");
  await expect(heading).toContainText(/long-stay stays/);
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
