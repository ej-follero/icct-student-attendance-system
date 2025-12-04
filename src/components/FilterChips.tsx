import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

interface FilterField {
  key: string;
  label: string;
  combineValues?: boolean;
  allowIndividualRemoval?: boolean;
}

interface FilterChipsProps {
  filters: Record<string, string[] | string>;
  fields: FilterField[];
  onRemove: (key: string, value?: string) => void;
  onClearAll: () => void;
  className?: string;
  searchQuery?: string;
  onRemoveSearch?: () => void;
  showSearchChip?: boolean;
  headerContent?: React.ReactNode;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ 
  filters, 
  fields, 
  onRemove, 
  onClearAll, 
  className = "",
  searchQuery = "",
  onRemoveSearch,
  showSearchChip = false,
  headerContent
}) => {
  const activeFields = fields.filter(f => {
    const value = filters[f.key];
    return value && (Array.isArray(value) ? value.length > 0 : value);
  });

  const hasActiveFilters = activeFields.length > 0 || (showSearchChip && searchQuery.trim());
  
  if (!hasActiveFilters) return null;

  const formatFilterLabel = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className={`${className}`}>
      {headerContent && (
        <div className="flex items-center justify-between mb-2">
          {headerContent}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 items-center">
        {showSearchChip && searchQuery.trim() && (
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 px-2 py-1">
            <Search className="w-3 h-3" />
            <span className="font-semibold">Search:</span>
            <span className="bg-blue-50 px-1 py-0.5 rounded text-xs">&quot;{searchQuery}&quot;</span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={onRemoveSearch}
              aria-label="Remove search query"
            >
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        )}

        {activeFields.map(field => {
          const value = filters[field.key];
          
          if (Array.isArray(value)) {
            if (field.allowIndividualRemoval) {
              return value.map((itemValue: string) => (
                <Badge 
                  key={`${field.key}-${itemValue}`} 
                  variant="outline" 
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 px-2 py-1"
                >
                  <span className="font-semibold">{field.label}:</span>
                  <span className="bg-blue-50 px-1 py-0.5 rounded text-xs">{itemValue}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 ml-1" 
                    onClick={() => onRemove(field.key, itemValue)}
                    aria-label={`Remove ${field.label} filter: ${itemValue}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ));
            } else {
              return (
                <Badge 
                  key={field.key} 
                  variant="outline" 
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 px-2 py-1"
                >
                  <span>{field.label}: {field.combineValues 
                    ? value.join(', ')
                    : `${value.length} selected`
                  }</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 ml-1" 
                    onClick={() => onRemove(field.key)}
                    aria-label={`Remove ${field.label} filter`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              );
            }
          } else {
            return (
              <Badge 
                key={field.key} 
                variant="outline" 
                className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 px-2 py-1"
              >
                <span className="font-semibold">{field.label}:</span>
                <span className="bg-blue-50 px-1 py-0.5 rounded text-xs">{value}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => onRemove(field.key)}
                  aria-label={`Remove ${field.label} filter`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            );
          }
        })}
      </div>
    </div>
  );
}; 