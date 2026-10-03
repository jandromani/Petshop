import { describe,expect,it } from "vitest";
import { identityScore } from "@/src/services/identity";

const candidate={id:"1",slug:"x",name:"Atlantic Sun Hotel",city:"Tenerife",country:"Spain",region:"Europe",lat:28.29,lng:-16.63};
describe("hotel identity resolution",()=>{
  it("matches close hotels with similar normalized names",()=>{
    expect(identityScore({name:"Atlantic Sun Resort",city:"Tenerife",country:"Spain",lat:28.291,lng:-16.631},candidate)).toBeGreaterThan(.72);
  });
  it("refuses cross-city collisions",()=>{
    expect(identityScore({name:"Atlantic Sun Hotel",city:"Malaga",country:"Spain",lat:36.7,lng:-4.4},candidate)).toBe(0);
  });
});
