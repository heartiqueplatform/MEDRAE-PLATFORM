import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Clock, Trophy, BookOpen, PlayCircle, RotateCcw } from "lucide-react";

export function Quizzes() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState("all");

  const quizzes = [
    {
      id: 1,
      title: "Pharmacology Basics",
      subject: "pharmacology",
      questions: 15,
      duration: 20,
      difficulty: "Easy",
      completed: true,
      score: 85,
      attempts: 2
    },
    {
      id: 2,
      title: "Cardiovascular System",
      subject: "anatomy",
      questions: 25,
      duration: 30,
      difficulty: "Medium",
      completed: true,
      score: 92,
      attempts: 1
    },
    {
      id: 3,
      title: "Nursing Ethics",
      subject: "ethics",
      questions: 20,
      duration: 25,
      difficulty: "Medium",
      completed: false,
      score: null,
      attempts: 0
    },
    {
      id: 4,
      title: "Advanced Pathophysiology",
      subject: "pathophysiology",
      questions: 30,
      duration: 45,
      difficulty: "Hard",
      completed: false,
      score: null,
      attempts: 0
    }
  ];

  const subjects = [
    { id: "all", name: "All Subjects" },
    { id: "pharmacology", name: "Pharmacology" },
    { id: "anatomy", name: "Anatomy" },
    { id: "ethics", name: "Ethics" },
    { id: "pathophysiology", name: "Pathophysiology" }
  ];

  const filteredQuizzes = selectedSubject === "all" 
    ? quizzes 
    : quizzes.filter(quiz => quiz.subject === selectedSubject);

  const completedQuizzes = quizzes.filter(q => q.completed).length;
  const averageScore = quizzes.filter(q => q.completed).reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes || 0;

  const startQuiz = (subject: string) => {
    navigate(`/quiz-units/${subject}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
          Quizzes & Self-Assessment
        </h1>
        <p className="text-muted-foreground mt-2">
          Test your knowledge and track your progress
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{completedQuizzes}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(averageScore)}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{quizzes.length}</p>
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
        <TabsList className="grid w-full grid-cols-5">
          {subjects.map((subject) => (
            <TabsTrigger key={subject.id} value={subject.id}>
              {subject.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedSubject} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredQuizzes.map((quiz) => (
              <Card key={quiz.id} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <CardDescription className="capitalize">
                        {quiz.subject.replace(/([A-Z])/g, ' $1').trim()}
                      </CardDescription>
                    </div>
                    <Badge className={getDifficultyColor(quiz.difficulty)}>
                      {quiz.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {quiz.questions} questions
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {quiz.duration} min
                    </div>
                  </div>

                  {quiz.completed && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Score: {quiz.score}%</span>
                        <span>Attempts: {quiz.attempts}</span>
                      </div>
                      <Progress value={quiz.score} className="h-2" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    {quiz.completed ? (
                      <>
                        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => startQuiz(quiz.subject)}>
                          <RotateCcw className="h-3 w-3" />
                          Retake
                        </Button>
                        <Button variant="secondary" size="sm">
                          View Results
                        </Button>
                      </>
                    ) : (
                      <Button className="flex items-center gap-1" onClick={() => startQuiz(quiz.subject)}>
                        <PlayCircle className="h-4 w-4" />
                        Start Quiz
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}