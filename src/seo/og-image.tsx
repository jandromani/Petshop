import { ImageResponse } from "next/og";

export const ogSize={width:1200,height:630};
export const ogContentType="image/png";

export function atlasOg(title:string,subtitle:string,kicker="ATLAS LONG STAY",stat?:string){
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"68px",background:"linear-gradient(135deg,#071630 0%,#102a56 55%,#d9ff72 160%)",color:"white",fontFamily:"Arial"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:22,fontWeight:800,letterSpacing:"0.12em"}}>{kicker}</div>
        <div style={{fontSize:18,color:"#c8d2e5"}}>30–90 DAY LIVING</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"1000px"}}>
        <div style={{fontSize:72,fontWeight:800,letterSpacing:"-0.05em",lineHeight:0.94}}>{title}</div>
        <div style={{fontSize:28,color:"#c9d4e8",lineHeight:1.3}}>{subtitle}</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{fontSize:22,color:"#d9ff72",fontWeight:700}}>{stat||"Prices shown only when verified."}</div>
        <div style={{fontSize:20,color:"#aebbd0"}}>atlas · long-stay hotels by month</div>
      </div>
    </div>,
    ogSize,
  );
}
