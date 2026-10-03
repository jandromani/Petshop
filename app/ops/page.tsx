export const metadata={title:"Operations access",robots:{index:false,follow:false}};
export default function OpsLogin(){
  return <main className="controlPage"><div className="shell" style={{maxWidth:560}}>
    <h1>OPERATIONS ACCESS</h1>
    <p style={{color:"#91a0b8"}}>Private control plane.</p>
    <form method="post" action="/api/ops/access" className="card" style={{marginTop:24}}>
      <label className="control"><span className="label">Operations key</span><input name="key" type="password" autoComplete="current-password" required/></label>
      <button className="btn lime" type="submit">Open Control Tower →</button>
    </form>
  </div></main>;
}
