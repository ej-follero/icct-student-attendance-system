import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Archive, Eye, Pencil, Trash2 } from "lucide-react";

interface TableRowActionsProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  itemName: string;
  disabled?: boolean;
  className?: string;
  deleteTooltip?: string;
  editTooltip?: string;
  editHasWarning?: boolean;
  disableDelete?: boolean;
  deleteVariant?: "delete" | "archive";
}

export function TableRowActions({
  onView,
  onEdit,
  onDelete,
  itemName,
  disabled = false,
  className = "",
  deleteTooltip,
  editTooltip,
  editHasWarning = false,
  viewAriaLabel,
  editAriaLabel,
  deleteAriaLabel,
  disableDelete = false,
  deleteVariant = "delete",
}: TableRowActionsProps & {
  viewAriaLabel?: string;
  editAriaLabel?: string;
  deleteAriaLabel?: string;
}) {
  const DeleteIcon = deleteVariant === "archive" ? Archive : Trash2;
  const deleteButtonHover =
    deleteVariant === "archive" ? "hover:bg-orange-50" : "hover:bg-red-50";
  const deleteIconClass =
    deleteVariant === "archive" ? "text-orange-600" : "text-red-600";
  const defaultDeleteTooltip = deleteVariant === "archive" ? "Archive" : "Delete";

  return (
    <TooltipProvider>
      <div className={`flex gap-1 justify-center ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={viewAriaLabel || `View ${itemName}`}
              className="hover:bg-blue-50"
              onClick={onView}
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="bg-blue-900 text-white">
            View details
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={editAriaLabel || `Edit ${itemName}`}
              className={`hover:bg-green-50 ${editHasWarning ? 'hover:bg-yellow-50' : ''}`}
              onClick={onEdit}
              disabled={disabled}
            >
              <Pencil className={`h-4 w-4 ${editHasWarning ? 'text-yellow-600' : 'text-green-600'}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="bg-blue-900 text-white">
            {editTooltip || "Edit"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                variant="ghost"
                size="icon"
                aria-label={deleteAriaLabel || `Delete ${itemName}`}
                className={deleteButtonHover}
                onClick={onDelete}
                disabled={disabled || disableDelete}
              >
                <DeleteIcon className={`h-4 w-4 ${deleteIconClass}`} />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="bg-blue-900 text-white">
            {deleteTooltip || defaultDeleteTooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
} 