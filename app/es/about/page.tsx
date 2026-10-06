import SpanishInformation from "@/components/SpanishInformation";
import { localizedMetadata } from "@/src/seo/public";
export const metadata=localizedMetadata("/about","es","Atlas · about","Información de Atlas en español.");
export default function Page(){return <SpanishInformation page="about"/>}
