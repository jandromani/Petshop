import { test,expect } from "@playwright/test";

test("a browser without WebGL keeps hotel search, a real 2D map and hotel selection working",async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,kind:string,...args:any[]){
      if(kind==="webgl"||kind==="webgl2"||kind==="experimental-webgl")return null;
      return original.call(this,kind,...args);
    } as typeof original;
  });
  // Do not generate automated tile traffic against the community service.
  await page.route("https://tile.openstreetmap.org/**",route=>route.fulfill({status:200,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=","base64")}));
  await page.setViewportSize({width:390,height:844});
  await page.goto("/stays?q=Madrid");
  await expect(page.getByRole("heading",{name:/Find one place/i})).toBeVisible();
  await page.getByRole("button",{name:/Map ·/i}).click();
  const shell=page.locator(".hotelMapShell");
  await expect(shell).toHaveAttribute("data-map-renderer","raster",{timeout:20000});
  await expect(shell).toHaveAttribute("data-map-ready","true");
  await expect(page.locator(".hotelMapRaster canvas")).toBeVisible();
  const picker=page.getByLabel("Select a hotel on the map");
  const option=picker.locator("option").nth(1);
  const hotelId=await option.getAttribute("value");
  const hotelName=await option.textContent();
  expect(hotelId).toBeTruthy();
  await picker.selectOption(hotelId!);
  await expect(page.locator(".mapHotelPreview")).toContainText(hotelName!);
  await expect(page.locator(".mapHotelPreview a")).toHaveAttribute("href",new RegExp("/stays/"+hotelId));
  await page.getByRole("button",{name:"Full map",exact:true}).click();
  await expect(shell).toHaveClass(/mapExpanded/);
  await page.getByRole("button",{name:"Close full map",exact:true}).click();
  await page.getByRole("button",{name:"List",exact:true}).click();
  await expect(page.locator(".hotelListPane")).toBeVisible();
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
});
