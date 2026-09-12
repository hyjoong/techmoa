"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "검색...",
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleSearch = () => {
    onChange(inputValue.trim());
  };

  const clearSearch = () => {
    setInputValue("");
    onChange("");
  };

  return (
    <form
      role="search"
      className="relative flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="search"
          aria-label={placeholder}
          enterKeyHint="search"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-10 pr-10 h-12 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            aria-label="검색어 지우기"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button
        type="submit"
        className="px-4 h-12 shrink-0"
        disabled={!(inputValue?.trim() || "")}
      >
        검색
      </Button>
    </form>
  );
}
