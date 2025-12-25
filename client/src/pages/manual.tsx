import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BookOpen, Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

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
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<{ content: string }>({
    queryKey: ["/api/manual"],
  });

  const scrollToMatch = useCallback((index: number) => {
    if (!contentRef.current) return;
    const marks = contentRef.current.querySelectorAll('mark[data-search-match]');
    if (marks.length === 0) return;
    
    marks.forEach((mark, i) => {
      if (i === index) {
        mark.classList.add('ring-2', 'ring-orange-500', 'ring-offset-1');
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        mark.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-1');
      }
    });
  }, []);

  const goToNextMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const nextIndex = (currentMatchIndex + 1) % totalMatches;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(nextIndex);
  }, [currentMatchIndex, totalMatches, scrollToMatch]);

  const goToPreviousMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const prevIndex = (currentMatchIndex - 1 + totalMatches) % totalMatches;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(prevIndex);
  }, [currentMatchIndex, totalMatches, scrollToMatch]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setCurrentMatchIndex(0);
    setTotalMatches(0);
  }, []);

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
      content = content.replace(regex, '<mark data-search-match class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded transition-all">$1</mark>');
    }

    return content;
  }, [data?.content, searchQuery]);

  useEffect(() => {
    if (!contentRef.current || !searchQuery.trim()) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      return;
    }
    
    const timer = setTimeout(() => {
      const marks = contentRef.current?.querySelectorAll('mark[data-search-match]');
      const count = marks?.length || 0;
      setTotalMatches(count);
      setCurrentMatchIndex(0);
      if (count > 0) {
        scrollToMatch(0);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [processedContent, searchQuery, scrollToMatch]);

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
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-4 -mx-4 px-4 md:-mx-6 md:px-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold hidden sm:block">Handleiding</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none sm:justify-end">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                <span className="hidden md:inline">
                  {totalMatches > 0 ? `${currentMatchIndex + 1} van ${totalMatches}` : 'Geen'}
                </span>
                <span className="md:hidden text-xs">
                  {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0'}
                </span>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToPreviousMatch}
                    disabled={totalMatches === 0}
                    title="Vorige resultaat"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToNextMatch}
                    disabled={totalMatches === 0}
                    title="Volgende resultaat"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
