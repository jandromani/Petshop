export const LEGAL_DOCUMENT_VERSION="2026-10-04-v1";

export function legalIdentity(){
  const operator=process.env.LEGAL_OPERATOR_NAME?.trim()||"";
  const email=process.env.LEGAL_CONTACT_EMAIL?.trim()||"";
  const country=process.env.LEGAL_COUNTRY?.trim()||"";
  return{
    operator,email,country,
    configured:Boolean(operator&&email&&country),
  };
}
