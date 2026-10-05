import type { Metadata } from "next";
import RealHotelDirectory from "@/components/RealHotelDirectory";
import { publicDirectorySnapshot } from "@/src/data/public-directory";

export const metadata:Metadata={title:"Real hotel directory",description:"Browse real hotels for 30–365 day stays. Property identity is kept separate from verified long-stay pricing.",robots:{index:false,follow:true}};

export default function StaysPage(){return <main className="seoPage"><RealHotelDirectory initialData={publicDirectorySnapshot(24)}/></main>;}