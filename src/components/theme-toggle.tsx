import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const cycle: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const labels: Record<Theme, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

const icons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Monitor className="h-4 w-4" />,
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label={labels[theme]}
            onClick={() => setTheme(cycle[theme])}
          >
            {icons[theme]}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels[theme]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
