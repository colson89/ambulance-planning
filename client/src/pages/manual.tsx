import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BookOpen, Search } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect, useRef } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function Manual() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<{ content: string }>({
    queryKey: ["/api/manual"],
  });

  const processedContent = useMemo(() => {
    if (!data?.content) return "";
    
    let content = data.content;
    
    content = content
      .replace(/^# (.+)$/gm, (_, title) => {
        const id = slugify(title);
        return `<h1 id="${id}" class="text-3xl font-bold mt-8 mb-4 text-primary border-b pb-2 scroll-mt-20">${title}</h1>`;
      })
      .replace(/^## (.+)$/gm, (_, title) => {
        const id = slugify(title);
        return `<h2 id="${id}" class="text-2xl font-semibold mt-6 mb-3 text-foreground scroll-mt-20">${title}</h2>`;
      })
      .replace(/^### (.+)$/gm, (_, title) => {
        const id = slugify(title);
        return `<h3 id="${id}" class="text-xl font-medium mt-4 mb-2 text-foreground scroll-mt-20">${title}</h3>`;
      })
      .replace(/^#### (.+)$/gm, (_, title) => {
        const id = slugify(title);
        return `<h4 id="${id}" class="text-lg font-medium mt-3 mb-2 text-muted-foreground scroll-mt-20">${title}</h4>`;
      })
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/\[([^\]]+)\]\(#([^)]+)\)/g, '<a href="#$2" data-anchor="$2" class="text-primary hover:underline cursor-pointer">$1</a>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      .replace(/^---$/gm, '<hr class="my-6 border-border" />')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(?!<[hliap]|<hr|<code|<strong|<em)(.+)$/gm, '<p class="mb-4">$1</p>');

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      content = content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
    }

    return content;
  }, [data?.content, searchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.hasAttribute('data-anchor')) {
        e.preventDefault();
        const anchorId = target.getAttribute('data-anchor');
        if (anchorId && contentRef.current) {
          const cleanId = slugify(anchorId.replace(/^-/, ''));
          const element = contentRef.current.querySelector(`[id="${cleanId}"]`) ||
                          contentRef.current.querySelector(`[id*="${cleanId}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    const container = contentRef.current;
    if (container) {
      container.addEventListener('click', handleClick);
      return () => container.removeEventListener('click', handleClick);
    }
  }, [processedContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Button variant="outline" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar Dashboard
        </Button>
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-destructive">Fout bij laden handleiding. Probeer later opnieuw.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Button variant="outline" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Handleiding</h1>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken in handleiding..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ambulance Planning Systeem - Handleiding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={contentRef}
            className="prose prose-sm max-w-none dark:prose-invert overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
