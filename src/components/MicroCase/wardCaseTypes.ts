// Shared types + template definitions for user-posted ward cases.

export type TemplateId = "ward" | "exam" | "reflection" | "drug" | "osce";

export interface TemplateField {
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
    multiline: boolean;
    maxLength?: number;
}

export interface TemplateDef {
    id: TemplateId;
    label: string;
    emoji: string;
    description: string;
    accent: string;      // tailwind classes for the icon bubble
    fields: TemplateField[];
}

export const TEMPLATES: TemplateDef[] = [
    {
        id: "ward",
        label: "Ward Case",
        emoji: "🩺",
        description: "Clinical scenario with vitals, question, and rationale.",
        accent: "bg-teal-500",
        fields: [
            {
                key: "scenario",
                label: "Patient scenario *",
                placeholder: "62F post-CABG, BP 82/54, HR 118, cool extremities…",
                required: true,
                multiline: true,
                maxLength: 800,
            },
            {
                key: "question",
                label: "Critical question *",
                placeholder: "What is your first action?",
                required: true,
                multiline: false,
                maxLength: 200,
            },
            {
                key: "answer",
                label: "Your answer *",
                placeholder: "Fluid bolus 500mL NS, then reassess…",
                required: true,
                multiline: true,
                maxLength: 400,
            },
            {
                key: "rationale",
                label: "Clinical rationale (optional)",
                placeholder: "Why is this the priority?",
                required: false,
                multiline: true,
                maxLength: 500,
            },
        ],
    },
    {
        id: "exam",
        label: "Exam MCQ",
        emoji: "📝",
        description: "Multiple choice question with answer + explanation.",
        accent: "bg-blue-500",
        fields: [
            {
                key: "question",
                label: "Question *",
                placeholder: "Which finding is most concerning in a patient on…",
                required: true,
                multiline: true,
                maxLength: 500,
            },
            {
                key: "optionA",
                label: "Option A *",
                placeholder: "First option",
                required: true,
                multiline: false,
                maxLength: 150,
            },
            {
                key: "optionB",
                label: "Option B *",
                placeholder: "Second option",
                required: true,
                multiline: false,
                maxLength: 150,
            },
            {
                key: "optionC",
                label: "Option C *",
                placeholder: "Third option",
                required: true,
                multiline: false,
                maxLength: 150,
            },
            {
                key: "optionD",
                label: "Option D *",
                placeholder: "Fourth option",
                required: true,
                multiline: false,
                maxLength: 150,
            },
            {
                key: "correctAnswer",
                label: "Correct answer (A/B/C/D) *",
                placeholder: "A",
                required: true,
                multiline: false,
                maxLength: 1,
            },
            {
                key: "explanation",
                label: "Explanation *",
                placeholder: "Why is this correct?",
                required: true,
                multiline: true,
                maxLength: 500,
            },
        ],
    },
    {
        id: "reflection",
        label: "Clinical Reflection",
        emoji: "💭",
        description: "Personal learning moment from practice.",
        accent: "bg-purple-500",
        fields: [
            {
                key: "situation",
                label: "Situation *",
                placeholder: "What happened? Where? Who was involved?",
                required: true,
                multiline: true,
                maxLength: 800,
            },
            {
                key: "role",
                label: "Your role *",
                placeholder: "Student nurse, observer, team lead…",
                required: true,
                multiline: false,
                maxLength: 150,
            },
            {
                key: "action",
                label: "What you did *",
                placeholder: "Your actions and reasoning.",
                required: true,
                multiline: true,
                maxLength: 500,
            },
            {
                key: "outcome",
                label: "Outcome & lesson *",
                placeholder: "What was the result? What would you do differently?",
                required: true,
                multiline: true,
                maxLength: 500,
            },
        ],
    },
    {
        id: "drug",
        label: "Drug Calculation",
        emoji: "💊",
        description: "Dosage problem with worked solution.",
        accent: "bg-amber-500",
        fields: [
            {
                key: "prescription",
                label: "Prescription *",
                placeholder: "Heparin 25,000 units in 500mL D5W…",
                required: true,
                multiline: true,
                maxLength: 300,
            },
            {
                key: "patient",
                label: "Patient parameters *",
                placeholder: "Weight 65kg, 62yo, eGFR 45…",
                required: true,
                multiline: false,
                maxLength: 200,
            },
            {
                key: "question",
                label: "Question *",
                placeholder: "Calculate flow rate in mL/hr.",
                required: true,
                multiline: false,
                maxLength: 200,
            },
            {
                key: "answer",
                label: "Answer + steps *",
                placeholder: "Answer = 50 mL/hr. (Steps: 25,000 / 500 = 50 units/mL…)",
                required: true,
                multiline: true,
                maxLength: 800,
            },
        ],
    },
    {
        id: "osce",
        label: "OSCE Station",
        emoji: "🎓",
        description: "Exam station setup, checklist, and correct steps.",
        accent: "bg-rose-500",
        fields: [
            {
                key: "setting",
                label: "Setting *",
                placeholder: "Emergency room, ED triage bay 3…",
                required: true,
                multiline: false,
                maxLength: 200,
            },
            {
                key: "complaint",
                label: "Patient complaint *",
                placeholder: "Chest pain radiating to left arm, started 30 min ago.",
                required: true,
                multiline: true,
                maxLength: 300,
            },
            {
                key: "checklist",
                label: "Assessment checklist *",
                placeholder: "1. Wash hands\n2. ABCDE\n3. Obtain ECG within 10 min\n…",
                required: true,
                multiline: true,
                maxLength: 800,
            },
            {
                key: "correctSteps",
                label: "Correct steps / rationale *",
                placeholder: "ECG first, then aspirin 300mg, GTN SL…",
                required: true,
                multiline: true,
                maxLength: 800,
            },
        ],
    },
];

export interface WardCase {
    id: string;
    user_id: string;
    template: TemplateId;
    title: string;
    content: Record<string, any>;
    related_unit: string | null;
    difficulty: "easy" | "medium" | "hard" | null;
    tags: string[];
    likes_count: number;
    comments_count: number;
    bookmarks_count: number;
    endorsements_count: number;
    views_count: number;
    hot_score: number;
    created_at: string;
    author_name: string;
    author_avatar: string | null;
    image_url?: string | null;
}

export function getTemplateDef(id: TemplateId): TemplateDef {
    return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}