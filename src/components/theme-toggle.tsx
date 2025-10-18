"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" data-testid="theme-toggle">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="theme-toggle"
          className="bg-gray-900/95 text-white border-gray-700 hover:bg-gray-800/95 dark:bg-white/95 dark:text-gray-900 dark:border-gray-200 dark:hover:bg-gray-100/95"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-gray-900/95 border-gray-700 dark:bg-white/95 dark:border-gray-200"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
