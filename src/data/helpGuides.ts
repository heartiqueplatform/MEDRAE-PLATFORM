// src/data/helpGuides.ts

export interface HelpGuide {
    code: string;
    title: string;
    subtitle?: string;
    sections: {
        heading: string;
        paragraphs?: string[];
        bullets?: string[];
        numbered?: string[];
        tip?: string;
    }[];
}

export const HELP_GUIDES: Record<string, HelpGuide> = {
    HELP01: {
        code: "HELP01",
        title: "How to Study a Unit Effectively",
        subtitle: "A 3-step routine that actually works",
        sections: [
            {
                heading: "Step 1 ~ Skim first, don't memorize",
                paragraphs: [
                    "Before you attempt any quiz, read the unit's title, description and topic. You don't need to master it ~ you just need to know what it's about.",
                    "This primes your brain so wrong answers later feel familiar instead of random. It's the difference between 'I've never seen this' and 'hmm, I think I read something about this'.",
                ],
                tip: "Give yourself 2 minutes max. Speed here, depth later.",
            },
            {
                heading: "Step 2 ~ Take the quiz cold",
                paragraphs: [
                    "No notes. No phone. No friends. Just you and the questions.",
                    "It will feel uncomfortable. That's the point. Your brain remembers things better when it struggles a little first ~ psychologists call this 'desirable difficulty'.",
                ],
                bullets: [
                    "Don't skip questions you don't know ~ guess and move on",
                    "Watch the timer, but don't rush",
                    "Write down (in your head) which ones felt shaky",
                    "Don't change answers unless you're sure ~ your first instinct is usually right",
                ],
            },
            {
                heading: "Step 3 ~ Review every wrong answer",
                numbered: [
                    "Read the correct answer first",
                    "Read the explanation if there is one",
                    "Ask: why did I pick the wrong one?",
                    "Say the correct answer out loud once",
                    "Close your eyes and repeat it silently",
                ],
                paragraphs: [
                    "This is where 80% of your learning actually happens. Most students skip this step. Don't be most students.",
                    "Reviewing wrong answers is uncomfortable ~ that's exactly why it works. The discomfort is your brain rewiring itself.",
                ],
                tip: "If you got it right by guessing, review it too. Lucky ≠ learned.",
            },
            {
                heading: "Spacing: the secret weapon",
                paragraphs: [
                    "Don't retake a unit immediately after finishing it. Your short-term memory will make it feel too easy.",
                    "Wait 24–48 hours, then retake. This forces your brain to retrieve from long-term memory ~ which is what exams actually test.",
                ],
                bullets: [
                    "Day 1: take the quiz",
                    "Day 2 or 3: retake it",
                    "Day 7: retake once more",
                    "Day 30: quick review if it's a weak topic",
                ],
                tip: "Four short sessions over a month beat ten sessions in one day. Always.",
            },
            {
                heading: "Sleep is part of studying",
                paragraphs: [
                    "Memories are consolidated during sleep, especially deep sleep and REM. Studying until 3 AM then waking at 6 AM is the fastest way to forget everything.",
                    "Aim for 7–8 hours the night after a heavy study session. Your brain does the filing while you rest.",
                ],
                tip: "If you must choose between one more hour of studying and one more hour of sleep ~ choose sleep. You'll remember more.",
            },
        ],
    },

    HELP02: {
        code: "HELP02",
        title: "How to Use Medrae Quizzes",
        subtitle: "The 5-minute tour",
        sections: [
            {
                heading: "1. Pick a category",
                paragraphs: [
                    "Tap one of the avatars at the top: Paper 1, Paper 2, Practice, Medical, Fun, NCLEX, or Help.",
                    "Each one filters the units below to that category. If you're not sure where to start, tap 'All Units'.",
                ],
            },
            {
                heading: "2. Pick a unit",
                paragraphs: [
                    "Tap any card to see what it covers ~ description, topic, difficulty level, and question count.",
                    "If it's unlocked (free or premium), tap Start Quiz. If it's locked, consider upgrading to unlock everything.",
                ],
            },
            {
                heading: "3. Take the quiz",
                bullets: [
                    "Answer every question ~ don't leave blanks",
                    "You can pause anytime; progress is saved automatically",
                    "Submit when you're done to see your score and review",
                    "Use the timer as a guide, not a pressure ~ it trains exam pacing",
                ],
            },
            {
                heading: "4. Review & repeat",
                paragraphs: [
                    "After submission, go to Progress to see your history and scores.",
                    "Retake weak units after a day or two ~ spaced repetition is your friend.",
                ],
                tip: "You don't need to finish everything in one sitting. Short, frequent sessions beat long cram sessions.",
            },
            {
                heading: "5. Use the random & recommend buttons",
                paragraphs: [
                    "In the search bar you'll see two small icons: a shuffle (random unit) and a compass (recommended unit).",
                ],
                bullets: [
                    "Shuffle: picks a surprise unit from your current category",
                    "Compass: recommends a unit you haven't completed yet",
                    "Refresh: re-syncs the latest units from the server",
                ],
                tip: "Feeling overwhelmed? Tap the compass. It picks for you so you can just start.",
            },
        ],
    },

    HELP03: {
        code: "HELP03",
        title: "How to Pass ANY Exam",
        subtitle: "Timeless strategies that work for every paper",
        sections: [
            {
                heading: "Before the exam ~ the week prior",
                paragraphs: [
                    "Cramming doesn't work. What works is going over the material multiple times in different ways.",
                ],
                bullets: [
                    "Do at least 2 full mock exams under timed conditions",
                    "Review every wrong answer ~ this is where points live",
                    "Get 8 hours of sleep every night (this is not optional)",
                    "Eat normally ~ don't skip meals or try new foods the day before",
                    "Prepare your materials (ID, pens, calculator) the night before",
                ],
                tip: "The week before the exam is not for learning new things. It's for locking in what you already know.",
            },
            {
                heading: "During the exam ~ pacing",
                paragraphs: [
                    "Most nursing exams give you roughly 1 minute per question. Practice pacing yourself at 50 seconds so you have buffer time at the end.",
                ],
                bullets: [
                    "Easy question → 20 seconds max",
                    "Medium → 45 seconds",
                    "Hard → 90 seconds, then move on",
                    "Never spend more than 2 minutes on a single question",
                ],
                tip: "If you're stuck, mark it and move. Your brain solves it in the background while you answer others.",
            },
            {
                heading: "During the exam ~ mindset",
                paragraphs: [
                    "Your goal is not to get every question right. Your goal is to get the questions you know right and make smart guesses on the rest.",
                ],
                bullets: [
                    "Read the question twice before looking at the options",
                    "Identify what's actually being asked (assessment? intervention? evaluation?)",
                    "Eliminate obviously wrong answers first",
                    "Trust your preparation ~ you've done this before",
                ],
            },
            {
                heading: "Answer selection ~ the strategy",
                paragraphs: [
                    "When you're not sure, apply these rules in order:",
                ],
                numbered: [
                    "Safety first ~ which answer keeps the patient safest?",
                    "ABC ~ Airway, Breathing, Circulation override everything else",
                    "Maslow ~ physiological needs before psychosocial",
                    "Least invasive first ~ try the simple thing before the complex",
                    "Never delegate assessment, teaching, or evaluation",
                    "Pick the answer that sounds most specific and confident",
                ],
                tip: "Extreme words like 'always', 'never', 'all', and 'only' are usually wrong. Nursing is rarely absolute.",
            },
            {
                heading: "After the exam",
                paragraphs: [
                    "Don't obsess over every question you got wrong. It's over. Celebrate that you showed up ~ most people never do.",
                ],
                bullets: [
                    "Write down 2–3 topics you struggled with",
                    "Review those topics in the next week while it's fresh",
                    "Take a real break ~ your brain needs recovery",
                ],
            },
        ],
    },

    HELP04: {
        code: "HELP04",
        title: "How to Pass NCLEX",
        subtitle: "The exam that thinks differently",
        sections: [
            {
                heading: "Understand the format first",
                paragraphs: [
                    "NCLEX is not like your nursing school exams. It's a CAT ~ Computerized Adaptive Test. That means:",
                ],
                bullets: [
                    "Every question is chosen based on how you answered the last one",
                    "Questions get harder if you're doing well (this is good)",
                    "It stops when the computer is 95% sure you're competent or not",
                    "Minimum 75 questions, maximum 145",
                    "You can't go back to previous questions",
                ],
                tip: "Harder questions don't mean you're failing ~ they mean you're being tested at a higher level. That's a good sign.",
            },
            {
                heading: "The NCLEX mindset shift",
                paragraphs: [
                    "Your nursing school taught you to think 'what's the diagnosis?' NCLEX wants you to think 'what's the safest action RIGHT NOW?'",
                    "You're not being tested on what you know. You're being tested on how you think as a nurse.",
                ],
                bullets: [
                    "Always ask: what's the priority?",
                    "Not 'what could be wrong' but 'what will I do first'",
                    "Not 'what does this condition need' but 'what does this patient need first'",
                    "Not 'what's the best long-term plan' but 'what's the immediate safe action'",
                ],
            },
            {
                heading: "The 6-step NCLEX process",
                numbered: [
                    "Read the question ~ identify what's being asked (assessment, intervention, teaching, evaluation)",
                    "Identify the client ~ age, condition, setting",
                    "Look for keywords ~ priority, first, best, initial, immediate, most important",
                    "Eliminate wrong answers using safety + ABC + Maslow",
                    "Apply the 'what would a safe nurse do' rule",
                    "Trust your preparation ~ don't second-guess without reason",
                ],
                tip: "If two answers both sound right, pick the one that's more basic, more immediate, and less invasive.",
            },
            {
                heading: "How to actually study for NCLEX",
                paragraphs: [
                    "NCLEX is a marathon of practice, not a sprint of memorization. Here's what actually works:",
                ],
                numbered: [
                    "Do 50–75 practice questions per day ~ every single day",
                    "Review EVERY question, right or wrong, and understand WHY",
                    "Focus on rationales, not just answers",
                    "Keep a running list of topics you keep getting wrong",
                    "Revisit those topics every week until they stick",
                    "Take a full 145-question practice exam once a week",
                ],
                tip: "Doing 3,000 practice questions with review beats 10,000 questions without review. Quality over quantity.",
            },
            {
                heading: "The day before NCLEX",
                bullets: [
                    "Do a light review only ~ don't cram",
                    "Visit the test center location so you know the route",
                    "Prepare your ID and authorization-to-test letter",
                    "Eat a normal dinner ~ nothing heavy or unfamiliar",
                    "Go to bed early ~ 8 hours of sleep",
                ],
                tip: "Don't study the day before. Your brain needs to rest to perform. Cramming the night before NCLEX is the #1 mistake.",
            },
            {
                heading: "The day of NCLEX",
                bullets: [
                    "Eat a real breakfast ~ protein, not just carbs",
                    "Arrive at least 30 minutes early",
                    "Use the bathroom before you sit down",
                    "Take every scheduled break ~ your brain needs the reset",
                    "Breathe. You prepared. Trust yourself.",
                ],
            },
            {
                heading: "During NCLEX ~ special strategies",
                paragraphs: [
                    "NCLEX has some unique question types that trip people up:",
                ],
                bullets: [
                    "SATA (Select All That Apply): Treat each option as true/false. Don't count. Don't look for patterns.",
                    "Prioritization: Always use ABC first, then Maslow, then safety",
                    "Delegation: Only delegate tasks, never assessment or teaching",
                    "Medication: Know the top 200 drugs by classification, not individual names",
                    "Math: Get the formula right, check units, then trust your answer",
                ],
                tip: "There's no penalty for guessing. Never leave a question blank. Ever.",
            },
            {
                heading: "After NCLEX",
                paragraphs: [
                    "You'll get your result within 48 hours (often faster). The quick results cost a small fee.",
                    "Whatever the outcome ~ you showed up. That took courage. If you passed, celebrate. If you didn't, you know exactly what to work on.",
                ],
                tip: "Most nurses who fail NCLEX pass on the second try. It's not a measure of your worth ~ it's a measure of your preparation.",
            },
        ],
    },

    HELP05: {
        code: "HELP05",
        title: "Exam Day Strategy",
        subtitle: "What to do when the clock is ticking",
        sections: [
            {
                heading: "Time per question",
                paragraphs: [
                    "Most nursing exams give you ~1 minute per question. Practice pacing yourself at 50 seconds so you have buffer time at the end.",
                ],
                bullets: [
                    "Easy question → 20 seconds max",
                    "Medium → 45 seconds",
                    "Hard → 90 seconds, then move on",
                ],
            },
            {
                heading: "When to skip",
                paragraphs: [
                    "If you've read a question twice and still don't know ~ skip it. Come back later. Your brain will often solve it in the background.",
                ],
            },
            {
                heading: "When to guess",
                paragraphs: [
                    "Never leave a question blank. If you're out of time, pick the answer that:",
                ],
                numbered: [
                    "Addresses the patient's safety first",
                    "Sounds most specific (not 'always' or 'never')",
                    "You've seen before in practice",
                ],
                tip: "Trust your first instinct unless you have a clear reason to change it. Overthinking kills scores.",
            },
        ],
    },
};