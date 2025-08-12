import { useThemePreference } from "@/context/ThemeProvider";
import { useI18n } from "@/context/I18nProvider";
import { Moon, Sun, Globe2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ThemeLangSwitcher = () => {
  const { theme, setThemePref } = useThemePreference();
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <button
        aria-label="Toggle theme"
        className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-accent"
        onClick={() => setThemePref(theme === 'dark' ? 'light' : 'dark')}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-muted-foreground" />
        <Select value={locale} onValueChange={(v) => setLocale(v as any)}>
          <SelectTrigger className="w-[110px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ThemeLangSwitcher;


