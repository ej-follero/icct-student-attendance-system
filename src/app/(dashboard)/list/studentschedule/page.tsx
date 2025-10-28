import React from "react";

const hours = ["8:00 am", "9:00 am", "10:00 am", "11:00 am", "12:00 nn"];
const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY",];

export default function SchedulePage() {
    return (
        <div className="overflow-x-auto bg-white">
            <div className="min-w-full p-2 bg-white">
                <h2 className="text-2xl font-bold text-blue-900">Weekly Timetable</h2>
                <p className="text-gray-600 mb-4">Your class schedule for this week</p>
            </div>
            <div className="text-md font-bold text-blue-900 bg-white m-3 border border-gray-300 rounded-sm mb-4 p-3">Current time: Today is **</div>
            <div className=" bg-white border border-gray-300 rounded-sm p-3">
                <h3 className="text-sm font-bold text-blue-900">Class Schedule</h3>
                <h3 className="text-sm text-gray-600 mb-4">Week of</h3>
                <table className="min-w-full border-separate rounded-xl m-2">
                    <thead>
                        <tr className="border border-transparent bg-gray-200 text-blue-900">
                            <th className="px-4 py-2 text-center">Time</th>
                            {days.map((day) => (
                                <th key={day} className="border border-transparent px-4 py-2 text-center">{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {hours.map((hour) => (
                            <tr key={hour}>
                                <td className="border gray-300 px-4 py-2 font-medium bg-gray-100">{hour}</td>
                                    {days.map((day) => (
                                <td key={day} className="border border-gray-300 px-4 py-2 h-16"></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}