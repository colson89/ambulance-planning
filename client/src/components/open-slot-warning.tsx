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
  onAddShift: (date: Date, startTime: string, endTime: string) => void;
}

export function OpenSlotWarning({ date, shifts, onAddShift }: OpenSlotWarningProps) {
  // Alleen detecteren voor nachtshifts
  const nightShifts = shifts.filter(s => 
    s.type === 'night' && 
    s.startTime && 
    s.endTime && 
    s.status !== 'open'
  );
  

  
  if (nightShifts.length === 0) return null;

  // Check coverage voor hele nachtshift periode (19:00-07:00)
  const timeSlots = Array(12).fill(0); // 19:00-07:00 = 12 uur slots
  
  nightShifts.forEach(shift => {
    const startTime = new Date(shift.startTime!);
    const endTime = new Date(shift.endTime!);
    
    const startHour = startTime.getUTCHours();
    const endHour = endTime.getUTCHours();
    
    // Map hours to slots (19=0, 20=1, ..., 23=4, 0=5, 1=6, ..., 6=11)
    let startSlot = startHour >= 19 ? startHour - 19 : startHour + 5;
    let endSlot = endHour >= 19 ? endHour - 19 : endHour + 5;
    
    // Handle all shifts properly
    if (startHour >= 19 && endHour <= 7) {
      // Shift crosses midnight (e.g., 19:00-07:00 or 23:00-07:00)
      for (let i = startSlot; i < 5; i++) { // 19:00-23:59
        timeSlots[i]++;
      }
      if (endHour > 0) {
        for (let i = 5; i < endSlot && i < 12; i++) { // 00:00-endHour
          timeSlots[i]++;
        }
      }
    } else if (startHour >= 19 && endHour >= 19) {
      // Shift within same day after 19:00 (e.g., 19:00-23:00)
      for (let i = startSlot; i < endSlot && i < 5; i++) {
        timeSlots[i]++;
      }
    } else if (startHour < 7 && endHour <= 7) {
      // Early morning shift (e.g., 00:00-07:00)
      for (let i = 5; i < endSlot && i < 12; i++) {
        timeSlots[i]++;
      }
    }
  });

  // Find understaffed slots and generate smart suggestions
  const suggestions = [];
  
  // Find continuous understaffed periods
  const understaffedPeriods = [];
  let periodStart = -1;
  
  for (let i = 0; i < 12; i++) {
    if (timeSlots[i] < 2) {
      if (periodStart === -1) periodStart = i;
    } else {
      if (periodStart !== -1) {
        understaffedPeriods.push({ start: periodStart, end: i });
        periodStart = -1;
      }
    }
  }
  
  // Check final period
  if (periodStart !== -1) {
    understaffedPeriods.push({ start: periodStart, end: 12 });
  }
  
  // Generate smart suggestions for each understaffed period
  understaffedPeriods.forEach(period => {
    const startHour = period.start < 5 ? period.start + 19 : period.start - 5;
    const endHour = period.end < 5 ? period.end + 19 : (period.end === 12 ? 7 : period.end - 5);
    
    // Always suggest the exact gap period
    const gapSuggestion = {
      start: startHour,
      end: endHour,
      startFormatted: `${startHour.toString().padStart(2, '0')}:00`,
      endFormatted: endHour === 7 ? "07:00" : `${endHour.toString().padStart(2, '0')}:00`,
      currentStaff: Math.min(...timeSlots.slice(period.start, period.end === 12 ? 12 : period.end)),
      neededStaff: 2,
      type: 'gap'
    };
    
    suggestions.push(gapSuggestion);
    
    // If the gap doesn't start at 19:00, also suggest full night coverage
    if (startHour !== 19) {
      const fullNightSuggestion = {
        start: 19,
        end: 7,
        startFormatted: "19:00",
        endFormatted: "07:00",
        currentStaff: Math.min(...timeSlots),
        neededStaff: 2,
        type: 'full'
      };
      
      suggestions.push(fullNightSuggestion);
    }
  });

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-orange-800">
            Open tijdslots - {format(date, "d MMMM yyyy", { locale: nl })}
          </h3>
        </div>
        
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  {suggestion.startFormatted} - {suggestion.endFormatted}
                </Badge>
                <span className="text-sm text-gray-600">
                  {suggestion.currentStaff === 0 ? 'Geen dekking' : `${suggestion.currentStaff}/2 personen`}
                </span>
                {suggestion.type === 'full' && (
                  <Badge variant="secondary" className="text-xs">
                    Hele nacht
                  </Badge>
                )}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddShift(date, suggestion.startFormatted, suggestion.endFormatted)}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <Plus className="h-4 w-4 mr-1" />
                Shift toevoegen
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}