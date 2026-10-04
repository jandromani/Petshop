import { describe,expect,it } from "vitest";
import { listSellableDirectOffers } from "@/src/db/direct-supply";

const enabled=Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("direct-offer query DB contracts",()=>{
  it("keeps optional date and duration parameters strongly typed in Postgres",async()=>{
    await expect(listSellableDirectOffers({limit:3})).resolves.toEqual(expect.any(Array));
    await expect(listSellableDirectOffers({
      limit:3,
      checkIn:"2027-01-15",
      flexibleDays:7,
      nights:90,
      occupancy:2,
      region:"Europe",
    })).resolves.toEqual(expect.any(Array));
  });
});
