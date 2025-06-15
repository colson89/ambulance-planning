import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shift } from "@shared/schema";

interface OpenSlotWarningProps {
  date: Date;
  shifts: Shift[];
  onAddShift: (date: Date, startTime: string, endTime: string) => void;
}

export function OpenSlotWarning({ date, shifts, onAddShift }: OpenSlotWarningProps) {
  // Detecteer open slots voor nachtshifts
  const nightShifts = shifts.filter(s => s.type === 'night');
  
  if (nightShifts.length === 0) return null;

  // Sorteer shifts op starttijd
  const sortedShifts = nightShifts.sort((a, b) => 
    new Date(a.startTime || a.date).getTime() - new Date(b.startTime || b.date).getTime()
  );

  const openSlots = [];
  let currentHour = 19; // Start van nachtshift

  for (const shift of sortedShifts) {
    const shiftStart = new Date(shift.startTime || shift.date).getHours();
    const adjustedStart = shiftStart < 12 ? shiftStart + 24 : shiftStart; // Voor tijden na middernacht
    
    if (currentHour < adjustedStart) {
      openSlots.push({
        start: currentHour,
        end: adjustedStart,
        startFormatted: `${currentHour.toString().padStart(2, '0')}:00`,
        endFormatted: `${(adjustedStart > 24 ? adjustedStart - 24 : adjustedStart).toString().padStart(2, '0')}:00`
      });
    }
    
    const shiftEnd = new Date(shift.endTime || shift.date).getHours();
    const adjustedEnd = shiftEnd < 12 ? shiftEnd + 24 : shiftEnd;
    currentHour = Math.max(currentHour, adjustedEnd);
  }

  // Check tot einde van nachtshift (07:00)
  if (currentHour < 31) { // 31 = 24 + 7
    openSlots.push({
      start: currentHour,
      end: 31,
      startFormatted: `${(currentHour > 24 ? currentHour - 24 : currentHour).toString().padStart(2, '0')}:00`,
      endFormatted: "07:00"
    });
  }

  if (openSlots.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-orange-800">Open tijdslots gedetecteerd</h3>
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