import { describe,expect,it,vi } from "vitest";
import { matchesDirectorySearch,resolveSearchScope } from "@/src/core/directory-search";
import { publicDirectorySnapshot } from "@/src/data/public-directory";
import { GET } from "@/app/api/hotels/directory/route";

vi.mock("@/src/db/client",()=>({databaseConfigured:()=>false,getDatabase:()=>null}));
const hotels=[
  {name:"Madrid hotel",city:"Madrid",market:"Madrid",country:"Spain"},
  {name:"Hotel 3K Madrid",city:"Lisboa",market:"Lisbon",country:"Portugal"},
  {name:"Hotel Nadal",city:"Benidorm",market:"Benidorm",country:"Spain",address:"Av. de Madrid, 41"},
  {name:"Holiday Inn Express Madrid",city:"Alcobendas",market:"Madrid",country:"Spain"},
];
describe("destination search",()=>{
  it("keeps a destination local while retaining mapped metro-area hotels",()=>{
    const scope=resolveSearchScope("Madrid","auto",hotels);
    expect(scope).toBe("destination");
    expect(hotels.filter(h=>matchesDirectorySearch(h,"Madrid",scope)).map(h=>h.city)).toEqual(["Madrid","Alcobendas"]);
  });
  it("allows the explicit hotel-name override and accent-insensitive destinations",()=>{
    expect(matchesDirectorySearch(hotels[1],"Madrid","hotel")).toBe(true);
    expect(resolveSearchScope("MÁDRID","auto",hotels)).toBe("destination");
    expect(matchesDirectorySearch({name:"Demo",city:"Málaga",country:"Spain"},"Malaga","destination")).toBe(true);
    expect(matchesDirectorySearch(hotels[2],"Madrid","hotel")).toBe(false);
  });
  it("returns consistent server HTML, API list and map identities for Madrid",async()=>{
    const snapshot=publicDirectorySnapshot(60,{q:"Madrid"});
    const list=await (await GET(new Request("https://atlas.test/api/hotels/directory?q=Madrid&limit=60"))).json();
    const map=await (await GET(new Request("https://atlas.test/api/hotels/directory?q=Madrid&view=map"))).json();
    expect(list.total).toBe(snapshot.total);expect(map.total).toBe(list.total);
    expect(list.hotels.map((h:any)=>h.id)).toEqual(snapshot.hotels.map(h=>h.id));
    expect(map.hotels.some((h:any)=>/Lisbo|Benidorm/.test(h.city))).toBe(false);
    expect(list.search.scope).toBe("destination");expect(list.total).toBeGreaterThan(200);
    const names=await (await GET(new Request("https://atlas.test/api/hotels/directory?q=Hotel%203K%20Madrid&searchScope=hotel"))).json();
    expect(names.hotels.some((h:any)=>h.city==="Lisboa")).toBe(true);
  });
});
