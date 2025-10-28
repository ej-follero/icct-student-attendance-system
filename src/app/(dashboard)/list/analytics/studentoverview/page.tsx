"use client";
import React, {useState} from "react";

export default function AnalyticsOverviewPage() {
    const [activeTab, setActiveTab] = useState<"attendanceTrends" | "subjectAnalysis" | "dailyPatterns" | "performanceInsights">("attendanceTrends");
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-900">Analytics & Performance</div>
            <div className="text-sm text-gray-400 mb-2">Comprehensive analysis of your attendance patterns</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="text-lg font-bold text-blue-900">Overall Rate</div>
                    <div className="text-3xl font-extrabold text-green-600">Num</div>
                    <div className="text-sm text-gray-600">+% from last month</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="text-lg font-bold text-blue-900">Current Streak</div>
                    <div className="text-3xl font-extrabold text-green-600">Num</div>
                    <div className="text-sm text-gray-600">Consecutive days present</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="text-lg font-bold text-blue-900">At Risk Subjects</div>
                    <div className="text-3xl font-extrabold text-red-600">Num</div>
                    <div className="text-sm text-gray-600">Below % attendance rate</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="text-lg font-bold text-blue-900">Monthly Goal</div>
                    <div className="text-3xl font-extrabold text-blue-900">Num</div>
                    <div className="text-sm text-gray-600">Above % target</div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-2xl font-bold text-blue-900">Student Profile</div>
                <div className="text-sm text-gray-400 mb-2">Manage your personal information and settings</div>
                <div className="flex flex-row mb-4 space-x-1 bg-gray-100 p-1 rounded text-sm font-semibold text-gray-700">
                    <button className={`rounded-md px-1 ${activeTab === "attendanceTrends" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setActiveTab("attendanceTrends")}>Attendance Trends</button>
                    <button className={`rounded-md px-1 ${activeTab === "subjectAnalysis" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setActiveTab("subjectAnalysis")}>Subject Analysis</button>
                    <button className={`rounded-md px-1 ${activeTab === "dailyPatterns" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setActiveTab("dailyPatterns")}>Daily Patterns</button>
                    <button className={`rounded-md px-1 ${activeTab === "performanceInsights" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setActiveTab("performanceInsights")}>Performance Insights</button>
                </div>
            </div>
            {/* Attendance Trends Tab */}
            <div className={`grid grid-cols-2 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4 ${activeTab !== "attendanceTrends" ? "hidden" : ""}`}>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Monthly Attendance Trend</div>
                    <div className="text-sm text-gray-600">Your attendance percentage over the past months</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Graph Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Weekly Breakdown</div>
                    <div className="text-sm text-gray-600">Present, absent, and late entries by week</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Graph Placeholder]
                    </div>
                </div>
            </div>
            {/* Subject Analysis Tab */}
            <div className={`grid grid-cols-2 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4 ${activeTab !== "subjectAnalysis" ? "hidden" : ""}`}>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Subject-wise Attendance</div>
                    <div className="text-sm text-gray-600">Attendance percentage by subject</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Graph Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Attendance Distribution</div>
                    <div className="text-sm text-gray-600">Overall breakdown of attendance status</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Graph Placeholder]
                    </div>
                </div>
                <div className="col-span-2 text-blue-900 m-2">
                    <div className="text-lg font-bold">Subject Performance Details</div>
                    <div className="text-sm text-gray-600">Detailed breakdown by subject</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Graph Placeholder]
                    </div>
                </div>
            </div>
            {/* Daily Patterns Tab */}
            <div className={`grid grid-cols-3 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4 ${activeTab !== "dailyPatterns" ? "hidden" : ""}`}>
                <div className="col-span-3 text-blue-900 m-2">
                    <div className="text-lg font-bold">Daily RFID Scan Patterns</div>
                    <div className="text-sm text-gray-600">Your scanning activity throughout the day</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Graph Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Peak Hours</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Scan Reliability</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Punctuality Score</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Score Placeholder]
                    </div>
                </div>
            </div>
            {/* Performance Insights Tab */}
            <div className={`grid grid-cols-2 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4 ${activeTab !== "performanceInsights" ? "hidden" : ""}`}>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Positive Trends</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [List Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Areas to Improve</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Suggestions Placeholder]
                    </div>
                </div>
                <div className="text-blue-900 m-2">
                    <div className="text-lg font-bold">Recommendations</div>
                    <div className="text-sm text-gray-600 font-normal">Personalized suggestions to improve your attendance</div>
                    <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        [Suggestions Placeholder]
                    </div>
                </div>
            </div>
        </div>
    );
}
