"use client";
import React, { useState } from "react";

export default function StudentProfile() {
    const [activeTab, setActiveTab] = useState<"personal" | "academic" | "rfidcard" | "settings">("personal");

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-900">Student Profile</div>
            <div className="text-sm text-gray-400 mb-2">Manage your personal information and settings</div>
            <div className="flex flex-row mb-4 space-x-1 bg-gray-100 p-1 rounded text-sm font-semibold text-gray-700">
                <button className={`rounded-md px-1 ${activeTab === "personal" ? "bg-white" : "bg-gray-100"}`}
                onClick={() => setActiveTab("personal")}>Personal Info</button>
                <button className={`rounded-md px-1 ${activeTab === "academic" ? "bg-white" : "bg-gray-100"}`}
                onClick={() => setActiveTab("academic")}>Academic Details</button>
                <button className={`rounded-md px-1 ${activeTab === "rfidcard" ? "bg-white" : "bg-gray-100"}`}
                onClick={() => setActiveTab("rfidcard")}>RFID Card</button>
                <button className={`rounded-md px-1 ${activeTab === "settings" ? "bg-white" : "bg-gray-100"}`}
                onClick={() => setActiveTab("settings")}>Settings</button>
            </div>

            {/* Personal Info Section */}
            <div className={`mb-6 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4 ${activeTab !== "personal" ? "hidden" : ""}`}>
                <div className="text-lg font-bold text-blue-900">Personal Info</div>
                <div className="text-sm text-gray-400 mb-2">Your basic personal details</div>
                <hr className="m-4" />
                <div className="grid grid-cols-2 font-bold text-blue-900">
                    <div className="m-1 p-1">
                        <h1>First Name</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">First Name Here</div>
                    </div>
                    <div className="m-1 p-1">
                        <h1>Last Name</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Last Name Here</div>
                    </div>
                    <div className="m-1 p-1">
                        <h1>Email Address</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Email Address Here</div>
                    </div>
                    <div className="m-1 p-1">
                        <h1>Phone Number</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Phone Number Here</div>
                    </div>
                    <div className="m-1 p-1 col-span-1">
                        <h1>Date of Birth</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Date of Birth Here</div>
                    </div>
                    <div className="m-1 p-1 col-span-2">
                        <h1>Address</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Address Here</div>
                    </div>
                </div>
                <hr className="m-4"/>
                <div className="grid grid-cols-3 font-bold text-blue-900">
                    <h1 className="col-span-3">Emergency Contact</h1>
                    <div className="m-1 p-1 colspan-1">
                        <h1>Name</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Emergency Contact Name Here</div>
                    </div>
                    <div className="m-1 p-1 colspan-1">
                        <h1>Relationship</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Relationship Here</div>
                    </div>
                    <div className="m-1 p-1 colspan-1">
                        <h1>Phone Number</h1>
                        <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Emergency Contact Phone Here</div>
                    </div>
                </div>
            </div>

            {/* Academic Details Section */}
            <div className={`${activeTab !== "academic" ? "hidden" : ""}`}>
                <div className="mb-4 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <div className="text-md font-bold text-blue-900">Academic Information</div>
                    <div className="text-sm text-gray-600 mb-2">Your academic progress and progress details</div>
                    <hr className="m-4" />
                    <div className="grid grid-cols-2 font-bold text-blue-900">
                        <div className="m-1 p-1">
                            <h1>Program</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Course Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Academic Year</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Academic Year Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Current Semester</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Current Semester Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Cumulative GPA</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Cumulative GPA Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Academic Advisor</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Academic Advisor Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Expected Graduation</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Graduation Date Here</div>
                        </div>
                    </div>
                </div>
                <div className="mb-6 border border-gray-300 rounded-sm bg-white pb-2 px-4 pt-4">
                    <div className="text-md font-bold text-blue-900">Current Enrollment</div>
                    <div className="text-sm text-gray-600 mb-2">Subjects you're currently enrolled in</div>
                </div>
            </div>
            {/* RFID Card Section */}
            <div className={`${activeTab !== "rfidcard" ? "hidden" : ""}`}>
                <div className="mb-6 border border-gray-400 rounded-sm bg-white pb-2 px-4 pt-4">
                    <div className="text-md font-bold text-blue-900">RFID Card Information</div>
                    <div className="text-sm text-gray-600 mb-2">Your RFID card details and status</div>
                    <hr className="m-4" />
                    <div className="grid grid-cols-2 font-bold text-blue-900">
                        <div className="m-1 p-1">
                            <h1>Card ID</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Card Number Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Status</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Status Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Issued Date</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Issued Date Here</div>
                        </div>
                        <div className="m-1 p-1">
                            <h1>Expiry Date</h1>
                            <div className="bg-gray-200 border border-gray-200 rounded-md p-2 font-normal">Expiry Date Here</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Settings Section */}
            <div className={`${activeTab !== "settings" ? "hidden" : ""}`}>
                <div className="mb-6 border border-gray-400 rounded-sm bg-white pb-2 px-4 pt-4">
                    <div className="text-md font-bold text-blue-900">Notification Preferences</div>
                    <div className="text-sm text-gray-600 mb-2">Choose what notifications you want to receive</div>
                    <hr className="m-4" />
                    <div className="grid grid-cols-1 font-bold text-blue-900">
                        <div className="">
                            <div>
                                <div className="text-sm">Attendance Alerts</div>
                                <div className="text-sm font-normal text-gray-600">Get notified about issues and reminders</div>
                            </div>
                            <div className="mt-2">
                                <label className="inline-flex relative items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">Enable</span>
                                </label>
                            </div>
                        </div>
                        <div className="">
                            <div>
                                <div className="text-sm">School Announcements</div>
                                <div className="text-sm font-normal text-gray-600">Receive important school wide announcements</div>
                            </div>
                            <div className="mt-2">
                                <label className="inline-flex relative items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">Enable</span>
                                </label>
                            </div>
                        </div>
                        <div className="">
                            <div>
                                <div className="text-sm">Grade Notifications</div>
                                <div className="text-sm font-normal text-gray-600">Get notified when new grades are posted</div>
                            </div>
                            <div className="mt-2">
                                <label className="inline-flex relative items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">Enable</span>
                                </label>
                            </div>
                        </div>
                        <div className="">
                            <div>
                                <div className="text-sm">Event Reminders</div>
                                <div className="text-sm font-normal text-gray-600">Reminders for upcoming school events and activities</div>
                            </div>
                            <div className="mt-2">
                                <label className="inline-flex relative items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">Enable</span>
                                </label>
                            </div>
                        </div>
                        <div className="">
                            <div>
                                <div className="text-sm">System Maintainance</div>
                                <div className="text-sm font-normal text-gray-600">Notifications about system updates and maintenance</div>
                            </div>
                            <div className="mt-2">
                                <label className="inline-flex relative items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">Enable</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 mt-4">
                        <div>Account Settings</div>
                        <div className="text-sm font-normal text-gray-600">Manage your account preferences</div>
                        <button className="mt-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-600">Change Password</button>
                        <button className="mt-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-600">Update Email Preferences</button>
                        <button className="mt-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-600">Export Calendar</button>
                        <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500">Deactivate Account</button>
                    </div>
                </div>
            </div>
        </div>
    );
}