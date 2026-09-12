import { Button } from "@/components/ui/button";
import { TAG_FILTER_OPTIONS, type TagCategory } from "@/lib/tag-filters";

interface TagFilterBarProps {
  value: TagCategory;
  selectedSubTags: string[];
  onChange: (value: TagCategory) => void;
  onSubTagChange: (subTags: string[]) => void;
}

export function TagFilterBar({
  value,
  selectedSubTags,
  onChange,
  onSubTagChange,
}: TagFilterBarProps) {
  // 현재 선택된 메인 태그의 서브태그들 가져오기
  const currentOption = TAG_FILTER_OPTIONS.find((opt) => opt.id === value);
  const subTags = currentOption?.tags ?? [];

  // 서브태그 클릭 핸들러
  const handleSubTagClick = (subTag: string) => {
    if (selectedSubTags.includes(subTag)) {
      // 이미 선택된 경우 제거
      const newSubTags = selectedSubTags.filter((tag) => tag !== subTag);
      onSubTagChange(newSubTags);
    } else {
      // 선택되지 않은 경우 추가
      onSubTagChange([...selectedSubTags, subTag]);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-2 px-2 sm:px-0 w-full">
      {/* 메인 태그 */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* 서브태그 목록: 항상 노출, 선택 시에도 배경 채우지 않음 */}
      {value !== "all" && subTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-4 border-l-2 border-primary/20">
          {subTags.map((subTag) => {
            const isSelected = selectedSubTags.includes(subTag);
            return (
              <Button
                key={subTag}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`rounded-full px-3 py-0 h-7 text-xs whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "border border-slate-300 dark:border-white/25 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleSubTagClick(subTag)}
              >
                {subTag}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
