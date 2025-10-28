import React from "react";

export default function RecordsTable() {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-900">Attendance Records</div>
            <div className="text-sm text-gray-400 mb-2">View your attendance history</div>
            <div className="grid grid-cols-3 min-w-full">
                <div className="mb-4 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <h1 className="text-md font-bold text-blue-900">Overall Attendance</h1>
                    <br />
                    <p className="text-sm text-gray-600">classes attended</p>
                </div>
                <div className="mb-4 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <h1 className="text-md font-bold text-blue-900">This Month</h1>
                    <br />
                    <p className="text-sm text-gray-600">classes attended</p>
                </div>
                <div className="mb-4 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <h1 className="text-md font-bold text-blue-900">Late Entries</h1>
                    <br />
                    <p className="text-sm text-gray-600">This semester</p>
                </div>
            </div>
            <div className="mb-6 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                <div className="text-md font-bold text-blue-900">Subject-wise Attendance</div>
                <div className="text-sm text-gray-400 mb-2">Attendance breakdown by subject</div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Total Classes</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Late</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center">
                            [Data Placeholder]
                        </div>
                    </tbody>
                </table>
            </div>
            <br />
            <div className="mb-6 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
            <div className="text-md font-bold text-blue-900">Detailed Records</div>
            <div className="text-sm text-gray-400 mb-2">Complete attendance history</div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Subject</th>
                            <th>Scheduled Time</th>
                            <th>RFID Scan Time</th>
                            <th>Room</th>
                            <th>Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <div className="h-64 bg-white border border-gray-300 rounded-lg flex items-center justify-center">
                            [Data Placeholder]
                        </div>
                    </tbody>
                </table>
            </div>
        </div>
    );
}