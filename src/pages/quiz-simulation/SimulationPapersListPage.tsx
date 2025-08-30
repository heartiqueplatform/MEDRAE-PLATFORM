"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SimulationPapersListPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPapers = async () => {
      const { data, error } = await supabase
        .from("simulation_papers")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load papers:", error);
      } else {
        setPapers(data);
      }

      setLoading(false);
    };

    fetchPapers();
  }, []);

  if (loading) return <p className="p-6">Loading papers...</p>;

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {papers.map((paper) => (
        <Card key={paper.id}>
          <CardHeader>
            <CardTitle>{paper.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Unit: {paper.unit || "—"}</p>
            <p>Type: {paper.type || "mock"}</p>
            <Link to={`/simulation/${paper.id}`}>
              <Button className="w-full">Start Simulation</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
