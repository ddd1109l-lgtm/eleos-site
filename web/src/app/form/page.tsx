import type { Metadata } from "next";
import GuideApp from "@/components/GuideApp";

export const metadata: Metadata = {
  title: "Form steps · Eleos",
};

export default function FormPage() {
  return <GuideApp />;
}
