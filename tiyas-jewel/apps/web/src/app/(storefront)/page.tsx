import { Homepage } from "@/features/home/homepage";
import {ContentHomepage} from "@/features/home/content-homepage";
import {publishedContent} from "@/lib/content-server";
export const dynamic = "force-dynamic";
export default async function HomePage() { const value=await publishedContent("homepage");return value?.type === "homepage" ? <ContentHomepage content={value.content}/> : <Homepage/>; }
