import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shift } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface OpenSlotWarningProps {
  date: Date;
  shifts: Shift[];
  onAddShift?: (date: Date, startTime: string, endTime: string, userId?: number) => void;
  showAddButton?: boolean;
  users?: Array<{id: number, firstName: string, lastName: string}>;
  requiredStaff?: number; // Required for night shifts
  requiredDayStaff?: number; // Required for day shifts (morning & afternoon)
}

export function OpenSlotWarning({ 
  date, 
  shifts, 
  onAddShift, 
  showAddButton = false, 
  users = [], 
  requiredStaff = 2,
  requiredDayStaff = 2 
}: OpenSlotWarningProps) {
  // Filter shifts for this date
  const dayShifts = shifts.filter(s => 
    s.type === 'day' && 
    s.startTime && 
    s.endTime &&
    new Date(s.date).toDateString() === date.toDateString()
  );

  const nightShifts = shifts.filter(s => 
    s.type === 'night' && 
    s.startTime && 
    s.endTime &&
    new Date(s.date).toDateString() === date.toDateString()
  );

  // === DAY SHIFT COVERAGE ANALYSIS (Hardcoded) ===
  let morningStaff = 0;
  let afternoonStaff = 0;

  dayShifts.forEach(shift => {
    if (shift.userId === 0) return; // Skip open shifts

    // Full day shift (not split): covers BOTH morning AND afternoon
    if (!shift.isSplitShift) {
      morningStaff++;
      afternoonStaff++;
    }
    // Split shift: determine which period based on startTime
    else if (shift.isSplitShift && shift.startTime) {
      let startHour = 0;
      const timeString = shift.startTime.toString();
      const hourMatch = timeString.match(/T(\d{2}):/);
      if (hourMatch) {
        startHour = parseInt(hourMatch[1], 10);
      }

      // Morning split: 07:00-13:00 (accounts for timezone)
      if (startHour === 5 || startHour === 6 || startHour === 7) {
        morningStaff++;
      }
      // Afternoon split: 13:00-19:00
      else if (startHour === 11 || startHour === 12 || startHour === 13) {
        afternoonStaff++;
      }
    }
  });

  // === NIGHT SHIFT COVERAGE ANALYSIS ===
  const nightStaffCount = nightShifts.filter(shift => shift.userId !== 0).length;

  // === BUILD GAP SUGGESTIONS ===
  const suggestions: any[] = [];

  // 1. Check morning period (7:00-13:00)
  if (dayShifts.length > 0 && morningStaff < requiredDayStaff) {
    const neededCount = requiredDayStaff - morningStaff;
    suggestions.push({
      period: 'morning',
      startFormatted: '07:00',
      endFormatted: '13:00',
      currentStaff: morningStaff,
      neededStaff: requiredDayStaff,
      neededCount: neededCount,
      shiftType: 'day' as const
    });
  }

  // 2. Check afternoon period (13:00-19:00)
  if (dayShifts.length > 0 && afternoonStaff < requiredDayStaff) {
    const neededCount = requiredDayStaff - afternoonStaff;
    suggestions.push({
      period: 'afternoon',
      startFormatted: '13:00',
      endFormatted: '19:00',
      currentStaff: afternoonStaff,
      neededStaff: requiredDayStaff,
      neededCount: neededCount,
      shiftType: 'day' as const
    });
  }

  // 3. Check night period (19:00-07:00)
  if (nightShifts.length > 0 && nightStaffCount < requiredStaff) {
    const neededCount = requiredStaff - nightStaffCount;
    suggestions.push({
      period: 'night',
      startFormatted: '19:00',
      endFormatted: '07:00',
      currentStaff: nightStaffCount,
      neededStaff: requiredStaff,
      neededCount: neededCount,
      shiftType: 'night' as const
    });
  }

  // Don't show warning if no gaps detected
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-orange-800 mb-1">
              Open tijdsloten voor {format(date, "dd MMM", { locale: nl })}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5"
                >
                  <Badge variant="outline" className="text-orange-700 border-orange-300 text-xs py-0.5">
                    {suggestion.startFormatted}-{suggestion.endFormatted}
                  </Badge>
                  <span className="text-xs text-gray-600">
                    ({suggestion.neededCount}x)
                  </span>
                  
                  {showAddButton && onAddShift && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onAddShift(date, suggestion.startFormatted, suggestion.endFormatted);
                      }}
                      className="h-6 px-2 text-orange-700 hover:bg-orange-100"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
