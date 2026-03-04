"use client";

import React from "react";
import ExamReady from "@/components/ExamReady";

const StudentAnalyticsPage = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Student Analytics</h1>

            {/* Render ExamReady component */}
            <ExamReady />
        </div>
    );
};

export default StudentAnalyticsPage;