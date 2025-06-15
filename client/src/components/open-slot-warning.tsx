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
  // Detecteren voor zowel dag- als nachtshifts
  const allShifts = shifts.filter(s => 
    s.startTime && 
    s.endTime && 
    s.status !== 'open'
  );
  
  if (allShifts.length === 0) return null;

  // Check coverage voor hele 24-uurs periode (07:00-07:00 volgende dag)
  const timeSlots = Array(24).fill(0); // 07:00-07:00 = 24 uur slots
  
  allShifts.forEach(shift => {
    const startTime = new Date(shift.startTime!);
    const endTime = new Date(shift.endTime!);
    
    const startHour = startTime.getUTCHours();
    const endHour = endTime.getUTCHours();
    
    // Map hours to slots starting from 07:00 (slot 0 = 07:00, slot 1 = 08:00, etc.)
    let startSlot = startHour >= 7 ? startHour - 7 : startHour + 17;
    let endSlot = endHour >= 7 ? endHour - 7 : endHour + 17;
    
    // Handle shifts that cross midnight
    if (startHour >= 7 && endHour <= 7 && endHour < startHour) {
      // Shift crosses midnight (e.g., 19:00-07:00 or 23:00-07:00)
      for (let i = startSlot; i < 24; i++) { // From start until midnight
        timeSlots[i]++;
      }
      for (let i = 0; i < endSlot; i++) { // From midnight until end
        timeSlots[i]++;
      }
    } else if (startHour >= 7) {
      // Normal shift within same day starting after 07:00
      for (let i = startSlot; i < endSlot && i < 24; i++) {
        timeSlots[i]++;
      }
    } else {
      // Early morning shift ending before 07:00
      for (let i = startSlot; i < endSlot && i < 24; i++) {
        timeSlots[i]++;
      }
    }
  });

  // Find uncovered slots
  const openSlots = [];
  let gapStart = -1;
  
  for (let i = 0; i < 12; i++) {
    if (timeSlots[i] === 0) {
      if (gapStart === -1) gapStart = i;
    } else {
      if (gapStart !== -1) {
        // Found a gap from gapStart to i
        const startHour = gapStart < 5 ? gapStart + 19 : gapStart - 5;
        const endHour = i < 5 ? i + 19 : i - 5;
        
        openSlots.push({
          start: startHour,
          end: endHour,
          startFormatted: `${startHour.toString().padStart(2, '0')}:00`,
          endFormatted: `${endHour.toString().padStart(2, '0')}:00`
        });
        gapStart = -1;
      }
    }
  }
  
  // Check final gap at end of night period
  if (gapStart !== -1) {
    const startHour = gapStart < 5 ? gapStart + 19 : gapStart - 5;
    openSlots.push({
      start: startHour,
      end: 7,
      startFormatted: `${startHour.toString().padStart(2, '0')}:00`,
      endFormatted: "07:00"
    });
  }

  if (openSlots.length === 0) return null;

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
          {openSlots.map((slot, index) => (
            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  {slot.startFormatted} - {slot.endFormatted}
                </Badge>
                <span className="text-sm text-gray-600">Geen dekking</span>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddShift(date, slot.startFormatted, slot.endFormatted)}
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