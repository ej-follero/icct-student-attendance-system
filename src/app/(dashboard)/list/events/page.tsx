"use client";
import { useState } from "react";
import { eventsData, role } from "@/lib/data";
import { Filter, SortAsc, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";

// Event type
type Event = {
  id: number;
  title: string;
  class: string;
  date: string;
  startTime: string;
  endTime: string;
};

const columns = [
  { header: "Title", accessor: "title" },
  { header: "Class", accessor: "class" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  {
    header: "Start Time",
    accessor: "startTime",
    className: "hidden md:table-cell",
  },
  {
    header: "End Time",
    accessor: "endTime",
    className: "hidden md:table-cell",
  },
  { header: "Actions", accessor: "action" },
];

const ITEMS_PER_PAGE = 10;

const EventListPage = () => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  // Modal state for create/update/delete can be added here

  // Filtered and paginated data
  const filteredData = eventsData.filter(
    (event) =>
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.class.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderRow = (item: Event) => (
    <TableRow
      key={item.id}
      className="even:bg-slate-50 hover:bg-sasLightBlue text-sm"
    >
      <TableCell className="flex items-center gap-4">{item.title}</TableCell>
      <TableCell>{item.class}</TableCell>
      <TableCell className="hidden md:table-cell">{item.date}</TableCell>
      <TableCell className="hidden md:table-cell">{item.startTime}</TableCell>
      <TableCell className="hidden md:table-cell">{item.endTime}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <Button variant="ghost" size="icon" aria-label="Edit event">
                <Pencil className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Delete event">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold">All Events</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch value={search} onChange={setSearch} />
          <div className="flex items-center gap-2 self-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFilterDialogOpen(true)}
              aria-label="Filter"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDialogOpen(true)}
              aria-label="Sort"
            >
              <SortAsc className="h-4 w-4" />
            </Button>
            {role === "admin" && (
              <Button variant="default" size="icon" aria-label="Add event">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.accessor} className={col.className || ""}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map(renderRow)
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  No events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* PAGINATION */}
      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
      {/* FILTER DIALOG (structure only) */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Events</DialogTitle>
          </DialogHeader>
          {/* Add filter fields here */}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFilterDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* SORT DIALOG (structure only) */}
      <Dialog open={sortDialogOpen} onOpenChange={setSortDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sort Events</DialogTitle>
          </DialogHeader>
          {/* Add sort options here */}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSortDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventListPage;
