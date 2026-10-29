"use client";
import { useParams } from "next/navigation";
import EstimateEditor from "../EstimateEditor";

export default function EstimateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  return <EstimateEditor key={id} id={id} />;
}
