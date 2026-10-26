import type { Metadata } from "next";
import FormRouter from "@/components/FormRouter";

export const metadata: Metadata = {
  title: "Form steps · Eleos",
};

export default function FormPage() {
  return <FormRouter />;
}
