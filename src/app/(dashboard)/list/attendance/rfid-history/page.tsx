import React from "react";
//Temporary data
export default function historyTable() {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-900">RFID Scan History</div>
            <div className="text-sm text-gray-400 mb-2">View your RFID scan history</div>
            <div className="flex flex-row min-w-full">
                <div className="basis-1/4 m-1 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <h1 className="font-bold text-blue-900">Total Scans</h1>
                    <br/>
                    <p className="text-sm text-gray-500">This Semester</p>
                </div>
                <div className="basis-1/4 m-1 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <h1 className="font-bold text-blue-900">Success Rate</h1>
                    <br/>
                    <p className="text-sm text-gray-500">Succcessful Scans</p>
                </div>
                <div className="basis-1/4 m-1 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <h1 className="font-bold text-blue-900">Today's Scans</h1>
                    <br/>
                    <p className="text-sm text-gray-500">Scans Today</p>
                </div>
                <div className="basis-1/4 text-md font-bold text-blue-900 m-1 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">Card Status</div>
            </div>
            <div className="text-md text-blue-900 border border-gray-400 rounded-sm m-1 p-4">Filter History</div>
        </div>
    );
}