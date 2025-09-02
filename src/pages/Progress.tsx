"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  Star,
  BookOpen,
  Clock,
  Award,
} from "lucide-react";

import { allUnits } from "@/constants/units";


export function StudyProgress() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStarsEarned, setTotalStarsEarned] = useState(0);

    useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not found or auth error");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quiz_results")
        .select("unit, score, total_questions")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching quiz results:", error.message);
        setLoading(false);
        return;
      }

      // Group results by unit
      const grouped: Record<string, { score: number; total: number; count: number }> = {};
      data?.forEach((res) => {
        const key = res.unit || "Unknown";
        if (!grouped[key]) grouped[key] = { score: 0, total: 0, count: 0 };
        grouped[key].score += res.score;
        grouped[key].total += res.total_questions;
        grouped[key].count += 1;
      });

      const unitsWithStats = allUnits
        .filter((unit) => grouped[unit.title])
        .map((unit) => {
          const stats = grouped[unit.title];
          const progress = stats.total > 0 ? Math.round((stats.score / stats.total) * 100) : 0;
          const hours = stats.count * 1.5;
          const rating = stats.count > 0 ? 5 : 0;

          return {
            id: unit.code,
            name: unit.title,
            progress,
            rating,
            hoursStudied: hours,
            topicsCompleted: stats.count,
            totalTopics: stats.count,
          };
        });

      setSubjects(unitsWithStats);
      setTotalStarsEarned(unitsWithStats.reduce((acc, s) => acc + s.rating, 0));
      setLoading(false);
    };

    // Run once on mount
    fetchProgress();

    // ✅ Realtime subscription
    const channel = supabase
      .channel("quiz_results_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_results" },
        (payload) => {
          console.log("Realtime update:", payload);
          setLoading(true); // show spinner while updating
fetchProgress();

        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const overallStats = {
    totalHours: subjects.reduce((acc, s) => acc + s.hoursStudied, 0),
    totalStars: totalStarsEarned,
    totalProgress: subjects.length
      ? subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length
      : 0,
    completedTopics: subjects.reduce((acc, s) => acc + s.topicsCompleted, 0),
    totalTopics: subjects.reduce((acc, s) => acc + s.totalTopics, 0),
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
          Study Progress Tracker
        </h1>
       <p className="text-muted-foreground mt-2">
  This tracker measures your learning journey in three ways: 
  <br />• <strong>Progress %</strong> is calculated as <em>completed topics ÷ total topics × 100</em>. 
  <br />• <strong>Stars</strong> are awarded once you submit at least one quiz through the Heartique Quizzes App. 
  <br />• <strong>Hours Studied</strong> are estimated at 1.5 hours per topic completed. 
  <br /><br />
  To earn scores and update your progress, you must complete and submit quizzes in the Heartique Quizzes App — your results will automatically update here.
</p>

      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(overallStats.totalProgress)}%
                </p>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{overallStats.totalHours}</p>
                <p className="text-sm text-muted-foreground">Hours Studied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {overallStats.completedTopics}/{overallStats.totalTopics}
                </p>
                <p className="text-sm text-muted-foreground">Topics Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {overallStats.totalStars}★
                </p>
                <p className="text-sm text-muted-foreground">Total Stars Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">By Unit</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
        {loading ? (
  <div className="flex justify-center items-center py-10">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
    <p className="ml-4 text-muted-foreground">Updating progress...</p>
  </div>
) : (

            <div className="grid gap-4">
              {subjects.map((subject) => (
                <Card key={subject.id} className="transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        <CardDescription>
                          {subject.topicsCompleted} of {subject.totalTopics} topics completed
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          {renderStars(subject.rating)}
                        </div>
                        <Badge variant="secondary">{subject.progress}% Complete</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{subject.progress}%</span>
                      </div>
                      {/* Full blue progress bar */}
                      <Progress value={subject.progress} className="h-2 [&>div]:bg-blue-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-lg">{subject.hoursStudied}</p>
                        <p className="text-muted-foreground">Hours</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{subject.topicsCompleted}</p>
                        <p className="text-muted-foreground">Topics</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{subject.rating}/5</p>
                        <p className="text-muted-foreground">Rating</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Learning Timeline
              </CardTitle>
              <CardDescription>Your progress over the past weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-l-2 border-primary pl-4">
                <div className="relative">
                  <div className="absolute -left-6 w-3 h-3 bg-primary rounded-full" />
                  <div className="space-y-1">
                    <p className="font-medium">Completed latest quiz</p>
                    <p className="text-sm text-muted-foreground">Recently • Updated</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
