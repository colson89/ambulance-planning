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
    
    // Map hours to slots (19=0, 20=1, ..., 23=4, 0=5, 1=6, ..., 7=12)
    let startSlot = startHour >= 19 ? startHour - 19 : startHour + 5;
    let endSlot = endHour >= 19 ? endHour - 19 : endHour + 5;
    
    // Handle wraparound shifts (cross midnight)
    if (startSlot <= endSlot) {
      for (let i = startSlot; i < endSlot && i < 12; i++) {
        timeSlots[i]++;
      }
    } else {
      // Shift crosses midnight
      for (let i = startSlot; i < 12; i++) {
        timeSlots[i]++;
      }
      for (let i = 0; i < endSlot && i < 12; i++) {
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
  
  // Check final gap
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