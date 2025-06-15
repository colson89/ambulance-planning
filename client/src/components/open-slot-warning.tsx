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
  // Alleen detecteren voor nachtshifts met split shifts
  const nightShifts = shifts.filter(s => 
    s.type === 'night' && 
    s.startTime && 
    s.endTime && 
    s.status !== 'open'
  );
  
  if (nightShifts.length < 2) return null; // Alleen waarschuwen als er meerdere shifts zijn die mogelijk een gat hebben

  // Sorteer shifts op starttijd
  const sortedShifts = nightShifts.sort((a, b) => 
    new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
  );

  const openSlots = [];
  
  // Check of er gaten zijn tussen opeenvolgende shifts
  for (let i = 0; i < sortedShifts.length - 1; i++) {
    const currentShift = sortedShifts[i];
    const nextShift = sortedShifts[i + 1];
    
    const currentEnd = new Date(currentShift.endTime!);
    const nextStart = new Date(nextShift.startTime!);
    
    // Als er een gat is van meer dan 5 minuten tussen shifts
    if (nextStart.getTime() - currentEnd.getTime() > 5 * 60 * 1000) {
      const endHour = currentEnd.getUTCHours();
      const startHour = nextStart.getUTCHours();
      
      openSlots.push({
        start: endHour,
        end: startHour,
        startFormatted: `${endHour.toString().padStart(2, '0')}:00`,
        endFormatted: `${startHour.toString().padStart(2, '0')}:00`
      });
    }
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