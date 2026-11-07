// src/components/Algorithm/types.ts
export interface UnitData {
    quiz_id: string;
    unit_name: string;
    attempts: number;
    average_score: number;
    latest_score: number;
    best_score: number;
    worst_score: number;
    trend: string;
    status: string;
    practice_level: string;
}

export interface RankingItem { value: UnitData; }