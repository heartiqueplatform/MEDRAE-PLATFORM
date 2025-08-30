import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Clock, Star, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// TODO: Replace with Supabase units and papers data
// Example: const { data: units } = await supabase.from('quiz_units').select('*').eq('subject_id', subjectId)

const mockUnits = {
  "medical-surgical": [
    {
      id: 1,
      name: "Cardiovascular System",
      description: "Heart conditions, cardiac care, and circulation",
      papers: [
        { id: 1, name: "Paper 1", questions: 30, duration: 45, difficulty: "Intermediate" },
        { id: 2, name: "Paper 2", questions: 25, duration: 40, difficulty: "Advanced" }
      ]
    },
    {
      id: 2,
      name: "Respiratory System",
      description: "Lung diseases, breathing disorders, and respiratory care",
      papers: [
        { id: 3, name: "Paper 1", questions: 28, duration: 42, difficulty: "Beginner" },
        { id: 4, name: "Paper 2", questions: 32, duration: 48, difficulty: "Intermediate" }
      ]
    },
    {
      id: 3,
      name: "Endocrine System",
      description: "Hormonal disorders, diabetes management, and metabolism",
      papers: [
        { id: 5, name: "Paper 1", questions: 26, duration: 40, difficulty: "Intermediate" },
        { id: 6, name: "Paper 2", questions: 29, duration: 45, difficulty: "Advanced" }
      ]
    }
  ],
  "pharmacology": [
    {
      id: 4,
      name: "Drug Classifications",
      description: "Understanding drug categories and mechanisms",
      papers: [
        { id: 7, name: "Paper 1", questions: 35, duration: 50, difficulty: "Beginner" },
        { id: 8, name: "Paper 2", questions: 30, duration: 45, difficulty: "Intermediate" }
      ]
    },
    {
      id: 5,
      name: "Dosage Calculations",
      description: "Mathematical calculations for drug administration",
      papers: [
        { id: 9, name: "Paper 1", questions: 20, duration: 30, difficulty: "Intermediate" },
        { id: 10, name: "Paper 2", questions: 25, duration: 35, difficulty: "Advanced" }
      ]
    }
  ]
};

export function QuizUnits() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  
  const units = mockUnits[subject as keyof typeof mockUnits] || [];
  
  const startQuiz = (unitId: number, paperId: number) => {
    navigate(`/quiz/${subject}/${unitId}/${paperId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/quizzes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
        <div>
          <h1 className="text-2xl font-bold capitalize">{subject?.replace('-', ' ')} Units</h1>
          <p className="text-muted-foreground">Select a unit and paper to start your quiz</p>
        </div>
      </div>

      <div className="grid gap-6">
        {units.map((unit) => (
          <Card key={unit.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {unit.name}
                  </CardTitle>
                  <p className="text-muted-foreground">{unit.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {unit.papers.map((paper) => (
                  <Card key={paper.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{paper.name}</h3>
                          <Badge className={getDifficultyColor(paper.difficulty)}>
                            {paper.difficulty}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {paper.questions} questions
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {paper.duration} minutes
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => startQuiz(unit.id, paper.id)}
                        >
                          Start Quiz
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {units.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No units available</h3>
            <p className="text-muted-foreground">
              Units for this subject are coming soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}