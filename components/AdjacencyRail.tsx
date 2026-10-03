"use client";

import { useEffect,useState } from "react";

type Partner={kind:string;label:string;description:string;configured:boolean;partnerName:string|null};

export default function AdjacencyRail(){
  const [partners,setPartners]=useState<Partner[]>([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    fetch("/api/adjacency/status",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{setPartners(Array.isArray(data?.partners)?data.partners:[]);setLoaded(true);})
      .catch(()=>setLoaded(true));
  },[]);
  if(!loaded)return null;

  return <section className="adjacencyBand"><div className="shell">
    <div className="sectionTitle">
      <h2>The rest of the life.<br/>Kept separate on purpose.</h2>
      <p>Flights, insurance, telemedicine, airport transfers and home management are independent referral lanes. They are never silently bundled into the hotel price.</p>
    </div>
    <div className="adjacencyGrid">
      {partners.map(p=><article className={"adjacencyCard "+(p.configured?"active":"inactive")} key={p.kind}>
        <div className="eyebrow">{p.configured?"PARTNER ACTIVE":"ACTIVATION REQUIRED"}</div>
        <h3>{p.label}</h3>
        <p>{p.description}</p>
        {p.configured
          ? <a className="btn" href={"/api/adjacency/referral?kind="+encodeURIComponent(p.kind)+"&from=%2F"}>Explore separately →</a>
          : <span className="adjacencyState">No commercial partner configured yet.</span>}
      </article>)}
    </div>
    <p className="adjacencyDisclosure">These services are separate referrals, not components of an Atlas package. Each provider sets its own price, terms and eligibility.</p>
  </div></section>;
}
