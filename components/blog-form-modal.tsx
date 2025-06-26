"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { createBlog, updateBlog, type Blog } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface BlogFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  editingBlog?: Blog | null
}

const categories = [
  { value: "frontend", label: "프론트엔드" },
  { value: "backend", label: "백엔드" },
  { value: "infra", label: "인프라" },
  { value: "career", label: "커리어" },
]

export function BlogFormModal({ isOpen, onClose, onSaved, editingBlog }: BlogFormModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    author: "",
    category: "",
    external_url: "",
    thumbnail_url: "",
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // 편집 모드일 때 폼 데이터 설정
  useEffect(() => {
    if (editingBlog) {
      setFormData({
        title: editingBlog.title,
        summary: editingBlog.summary || "",
        author: editingBlog.author,
        category: editingBlog.category,
        external_url: editingBlog.external_url,
        thumbnail_url: editingBlog.thumbnail_url || "",
        tags: editingBlog.tags || [],
      })
    } else {
      setFormData({
        title: "",
        summary: "",
        author: "",
        category: "",
        external_url: "",
        thumbnail_url: "",
        tags: [],
      })
    }
    setTagInput("")
  }, [editingBlog, isOpen])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== tagToRemove) }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.author || !formData.category || !formData.external_url) {
      toast({
        title: "오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const blogData = {
        ...formData,
        published_at: new Date().toISOString(),
        views: editingBlog?.views || 0,
      }

      if (editingBlog) {
        await updateBlog(editingBlog.id, blogData)
      } else {
        await createBlog(blogData)
      }

      onSaved()
    } catch (error) {
      console.error("저장 실패:", error)
      toast({
        title: "오류",
        description: editingBlog ? "블로그 수정에 실패했습니다." : "블로그 추가에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBlog ? "블로그 수정" : "새 블로그 추가"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="블로그 제목을 입력하세요"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">작성자 *</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange("author", e.target.value)}
                placeholder="작성자명을 입력하세요"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">요약</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => handleInputChange("summary", e.target.value)}
              placeholder="블로그 내용 요약을 입력하세요"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">카테고리 *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_url">외부 링크 *</Label>
              <Input
                id="external_url"
                type="url"
                value={formData.external_url}
                onChange={(e) => handleInputChange("external_url", e.target.value)}
                placeholder="https://example.com/blog-post"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">썸네일 이미지 URL</Label>
            <Input
              id="thumbnail_url"
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => handleInputChange("thumbnail_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">태그</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="태그를 입력하고 Enter를 누르세요"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                추가
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : editingBlog ? "수정" : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
