import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

// TODO: Replace with Supabase quiz questions data
// Example: const { data: questions } = await supabase.from('quiz_questions').select('*').eq('paper_id', paperId)

const mockQuestions = [
  {
    id: 1,
    question: "What is the normal heart rate range for adults?",
    options: [
      "40-60 beats per minute",
      "60-100 beats per minute", 
      "100-120 beats per minute",
      "120-140 beats per minute"
    ],
    correctAnswer: 1,
    explanation: "The normal resting heart rate for adults is 60-100 beats per minute."
  },
  {
    id: 2,
    question: "Which of the following is a common sign of myocardial infarction?",
    options: [
      "Severe headache",
      "Chest pain radiating to left arm",
      "Blurred vision", 
      "Frequent urination"
    ],
    correctAnswer: 1,
    explanation: "Chest pain that radiates to the left arm is a classic sign of myocardial infarction."
  },
  {
    id: 3,
    question: "What is the first-line treatment for anaphylaxis?",
    options: [
      "Antihistamines",
      "Corticosteroids",
      "Epinephrine",
      "Bronchodilators"
    ],
    correctAnswer: 2,
    explanation: "Epinephrine is the first-line treatment for anaphylaxis as it counteracts the severe allergic reaction."
  },
  {
    id: 4,
    question: "Normal blood pressure range for adults is:",
    options: [
      "Less than 120/80 mmHg",
      "120-139/80-89 mmHg",
      "140-159/90-99 mmHg",
      "160/100 mmHg or higher"
    ],
    correctAnswer: 0,
    explanation: "Normal blood pressure is less than 120/80 mmHg."
  },
  {
    id: 5,
    question: "Which medication is commonly used to treat hypertension?",
    options: [
      "Aspirin",
      "Lisinopril",
      "Metformin",
      "Albuterol"
    ],
    correctAnswer: 1,
    explanation: "Lisinopril is an ACE inhibitor commonly used to treat hypertension."
  }
];

export function QuizTaking() {
  const { subject, unitId, paperId } = useParams();
  const navigate = useNavigate();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const [showResults, setShowResults] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmitQuiz();
    }
  }, [timeLeft, showResults]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setAnswers({
      ...answers,
      [currentQuestion]: answerIndex
    });
  };

  const toggleFlag = () => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(currentQuestion)) {
      newFlagged.delete(currentQuestion);
    } else {
      newFlagged.add(currentQuestion);
    }
    setFlaggedQuestions(newFlagged);
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    // TODO: Save quiz results to Supabase
    // await supabase.from('quiz_results').insert({ user_id, quiz_id, answers, score })
  };

  const calculateScore = () => {
    let correct = 0;
    mockQuestions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / mockQuestions.length) * 100);
  };

  const nextQuestion = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (showResults) {
    const score = calculateScore();
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            <div className="text-4xl font-bold text-primary">{score}%</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{mockQuestions.length}</div>
                <div className="text-sm text-muted-foreground">Total Questions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((score / 100) * mockQuestions.length)}
                </div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {mockQuestions.length - Math.round((score / 100) * mockQuestions.length)}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/quizzes')}>
                Back to Quizzes
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Review Answers */}
        <Card>
          <CardHeader>
            <CardTitle>Review Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {mockQuestions.map((question, index) => (
              <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">
                    {index + 1}. {question.question}
                  </h3>
                  <div className={`px-2 py-1 rounded text-sm ${
                    answers[index] === question.correctAnswer 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {answers[index] === question.correctAnswer ? 'Correct' : 'Incorrect'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div 
                      key={optionIndex}
                      className={`p-2 rounded ${
                        optionIndex === question.correctAnswer 
                          ? 'bg-green-50 border border-green-200' 
                          : answers[index] === optionIndex && optionIndex !== question.correctAnswer
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      {option}
                      {optionIndex === question.correctAnswer && (
                        <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                      )}
                      {answers[index] === optionIndex && optionIndex !== question.correctAnswer && (
                        <span className="ml-2 text-red-600 font-medium">(Your answer)</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-3 rounded">
                  <strong>Explanation:</strong> {question.explanation}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = mockQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">
                Question {currentQuestion + 1} of {mockQuestions.length}
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlag}
                className={flaggedQuestions.has(currentQuestion) ? 'bg-yellow-100' : ''}
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className={timeLeft < 300 ? 'text-red-600 font-bold' : ''}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <Button variant="destructive" onClick={handleSubmitQuiz}>
                Submit Quiz
              </Button>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">
            {question.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
            className="space-y-3"
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={nextQuestion}
          disabled={currentQuestion === mockQuestions.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Question Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Question Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {mockQuestions.map((_, index) => (
              <Button
                key={index}
                variant={currentQuestion === index ? "default" : "outline"}
                size="sm"
                className={`relative ${
                  answers[index] !== undefined 
                    ? 'bg-green-100 border-green-300' 
                    : flaggedQuestions.has(index)
                    ? 'bg-yellow-100 border-yellow-300'
                    : ''
                }`}
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
                {flaggedQuestions.has(index) && (
                  <Flag className="h-2 w-2 absolute -top-1 -right-1 text-yellow-600" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}