import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust this import if needed

// Convert rows to CSV
function rowsToCsv(rows: any[]): string {
  const header = [
    "Student ID",
    "ID Number",
    "Name",
    "Section",
    "Subject",
    "Present",
    "Absent",
    "Late",
    "Excused",
    "Last Seen",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        r.studentId,
        r.idNumber,
        r.name,
        r.section,
        r.subject,
        r.present,
        r.absent,
        r.late,
        r.excused,
        r.lastSeen
          ? new Date(r.lastSeen).toISOString().replace("T", " ").slice(0, 16)
          : "",
      ].join(",")
    );
  }

  return lines.join("\n");
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Fetch your data — adjust model name if different
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        students: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Convert to CSV string
    const csvData = rowsToCsv(report.students);

    // Convert to Uint8Array so it's compatible with Response
    const uint8Data = new Uint8Array(Buffer.from(csvData, "utf-8"));

    // Return CSV file as a downloadable response
    return new Response(uint8Data, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="report_${id}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating report CSV:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
