import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Shift } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";

interface OpenSlotWarningProps {
  date: Date;
  shifts: Shift[];
  onAddShift?: (date: Date, startTime: string, endTime: string, userId?: number) => void;
  showAddButton?: boolean;
  users?: Array<{id: number, firstName: string, lastName: string}>;
  requiredStaff?: number;
}

export function OpenSlotWarning({ date, shifts, onAddShift, showAddButton = false, users = [], requiredStaff = 2 }: OpenSlotWarningProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("0");
  const [pendingShift, setPendingShift] = useState<{startTime: string, endTime: string} | null>(null);

  // Alleen detecteren voor nachtshifts
  const nightShifts = shifts.filter(s => 
    s.type === 'night' && 
    s.startTime && 
    s.endTime &&
    new Date(s.date).toDateString() === date.toDateString()
  );


  
  if (nightShifts.length === 0) return null;



  // Helper function to extract clock hour (timezone-agnostic)
  const getClockHour = (timeValue: string | Date): number => {
    if (timeValue instanceof Date) return timeValue.getHours();
    if (typeof timeValue === 'string') {
      // If ISO with timezone (Z or +/-HH:MM), parse to Date to get local hour
      if (/Z|[+\-]\d{2}:\d{2}/.test(timeValue)) {
        const d = new Date(timeValue);
        if (!isNaN(d.getTime())) return d.getHours();
      }
      // Plain clock string HH:mm
      const m = timeValue.match(/^(\d{2}):(\d{2})/);
      if (m) return parseInt(m[1], 10);
      // Fallback
      const d2 = new Date(timeValue);
      if (!isNaN(d2.getTime())) return d2.getHours();
    }
    return 0;
  };

  // Convert shifts to time coverage
  const timeSlots = Array.from({ length: 24 }, (_, hour) => {
    let staffCount = 0;

    nightShifts.forEach(shift => {
      if (!shift.startTime || !shift.endTime || shift.userId === 0) return;

      // Extract clock hours (timezone-agnostic)
      const startHour = getClockHour(shift.startTime);
      const endHour = getClockHour(shift.endTime);

      // Determine if overnight shift by comparing hours only
      const overnight = endHour <= startHour;
      
      // Coverage check based on overnight status
      if (overnight) {
        // Overnight shift: covers from start hour to 24:00, then 0:00 to end hour
        if (hour >= startHour || hour < endHour) {
          staffCount++;
        }
      } else {
        // Same day shift
        if (hour >= startHour && hour < endHour) {
          staffCount++;
        }
      }
    });

    return staffCount;
  });


  // Find gaps where we have less than requiredStaff people for night coverage (19:00-07:00)
  const suggestions: any[] = [];
  
  // Check the night period specifically
  const nightHours = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];
  
  // First check if there are ANY gaps at all - if all hours have requiredStaff+ staff, don't show warning
  const hasAnyGaps = nightHours.some(hour => timeSlots[hour] < requiredStaff);
  if (!hasAnyGaps) {
    return null; // Perfect coverage - no warning needed
  }
  
  // Build gap suggestions for periods with insufficient coverage
  let gapStart = -1;
  
  for (let i = 0; i < nightHours.length; i++) {
    const hour = nightHours[i];
    const staffCount = timeSlots[hour];
    
    if (staffCount < requiredStaff) {
      if (gapStart === -1) {
        gapStart = i; // Store index in nightHours array
      }
    } else {
      if (gapStart !== -1) {
        // Found end of gap
        const startHour = nightHours[gapStart];
        const endHour = nightHours[i];
        
        const gapSuggestion = {
          start: startHour,
          end: endHour,
          startFormatted: String(startHour).padStart(2, '0') + ':00',
          endFormatted: String(endHour).padStart(2, '0') + ':00',
          currentStaff: Math.min(...nightHours.slice(gapStart, i).map(h => timeSlots[h])),
          neededStaff: requiredStaff,
          type: 'gap'
        };
        
        suggestions.push(gapSuggestion);
        gapStart = -1;
      }
    }
  }
  
  // Handle case where gap extends to the end of night shift
  if (gapStart !== -1) {
    const startHour = nightHours[gapStart];
    const endHour = 7; // End of night shift
    
    const gapSuggestion = {
      start: startHour,
      end: endHour,
      startFormatted: String(startHour).padStart(2, '0') + ':00',
      endFormatted: String(endHour).padStart(2, '0') + ':00',
      currentStaff: Math.min(...nightHours.slice(gapStart).map(h => timeSlots[h])),
      neededStaff: requiredStaff,
      type: 'gap'
    };
    
    suggestions.push(gapSuggestion);
  }
  

  if (suggestions.length === 0) return null;

  return (
    <>
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-orange-800 mb-2">
                Open tijdsloten gedetecteerd voor {format(date, "dd MMMM", { locale: nl })}
              </div>
              
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-orange-200 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {suggestion.startFormatted} - {suggestion.endFormatted}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {suggestion.currentStaff === 0 
                        ? `Geen dekking (${requiredStaff} ${requiredStaff === 1 ? 'persoon' : 'personen'} nodig)` 
                        : `${suggestion.currentStaff}/${requiredStaff} ${requiredStaff === 1 ? 'persoon' : 'personen'}`}
                    </span>
                  </div>
                  
                  {showAddButton && onAddShift && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPendingShift({
                          startTime: suggestion.startFormatted,
                          endTime: suggestion.endFormatted
                        });
                        setSelectedUserId("0");
                        setShowDialog(true);
                      }}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Shift toevoegen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog for user selection */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Shift Toevoegen</DialogTitle>
          </DialogHeader>
          
          {pendingShift && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Datum</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  {format(date, "dd MMMM yyyy", { locale: nl })}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="time">Tijd</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  {pendingShift.startTime} - {pendingShift.endTime}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="ambulancier">Ambulancier</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer ambulancier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">-- Open shift (niemand toegewezen) --</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {`${user.firstName} ${user.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => {
                if (pendingShift && onAddShift) {
                  const userId = selectedUserId === "0" ? undefined : parseInt(selectedUserId);
                  onAddShift(date, pendingShift.startTime, pendingShift.endTime, userId);
                  setShowDialog(false);
                  setPendingShift(null);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Shift Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}