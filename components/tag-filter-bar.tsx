import { Button } from "@/components/ui/button";
import { TAG_FILTER_OPTIONS, type TagCategory } from "@/lib/tag-filters";

interface TagFilterBarProps {
  value: TagCategory;
  onChange: (value: TagCategory) => void;
}

export function TagFilterBar({ value, onChange }: TagFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2 px-2 sm:px-0 w-full">
      {TAG_FILTER_OPTIONS.map((option) => {
        const isActive = option.id === value;
        return (
          <Button
            key={option.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4 whitespace-nowrap border-slate-300 dark:border-white/25"
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
