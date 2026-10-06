import { test,expect } from "@playwright/test";

test("hotel application submits to review and portal requires a private code",async({page})=>{
  let submitted:any;
  await page.route("**/api/hotels/apply",async route=>{submitted=route.request().postDataJSON();await route.fulfill({status:201,json:{ok:true,status:"AWAITING_CONTACT_REVIEW"}})});
  await page.goto("/for-hotels");
  await page.getByRole("link",{name:"Join the hotel pilot →"}).click();
  await page.getByLabel("Hotel name",{exact:true}).fill("Test hotel");
  await page.getByLabel("Official website").fill("https://example.com");
  await page.getByLabel("City / island").fill("Madrid");await page.getByLabel("Country",{exact:true}).fill("Spain");
  await page.getByLabel("Your name",{exact:true}).fill("Test manager");await page.getByLabel("Your role").fill("Owner");
  await page.getByLabel("Business email").fill("manager@example.com");await page.getByRole("checkbox",{name:/I represent this hotel/}).check();
  await page.getByRole("button",{name:"Apply for the hotel pilot →"}).click();
  await expect(page.getByRole("heading",{name:"Application received."})).toBeVisible();expect(submitted.contactConsent).toBe(true);
  await page.goto("/hotel-portal");await expect(page.getByLabel("Access code")).toBeVisible();
  await expect(page.getByRole("button",{name:"Submit rate for review →"})).toHaveCount(0);
});

test("Madrid destination stays local, hotel-name mode survives reload",async({page})=>{
  await page.goto("/stays?q=Madrid");
  await expect(page.getByText("Searching in destination: Madrid",{exact:true})).toBeVisible();
  await page.getByLabel("Search by",{exact:true}).selectOption("hotel");
  await page.getByLabel("Refine hotel results").fill("Hotel 3K Madrid");
  await expect(page.getByRole("heading",{name:"Hotel 3K Madrid",exact:true})).toBeVisible();
  await expect(page).toHaveURL(/searchScope=hotel/);
  await page.reload();await expect(page.getByLabel("Search by",{exact:true})).toHaveValue("hotel");
  await expect(page.getByRole("heading",{name:"Hotel 3K Madrid",exact:true})).toBeVisible();
});
