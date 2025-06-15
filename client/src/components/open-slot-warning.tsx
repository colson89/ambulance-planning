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
}

export function OpenSlotWarning({ date, shifts, onAddShift, showAddButton = false, users = [] }: OpenSlotWarningProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("0");
  const [pendingShift, setPendingShift] = useState<{startTime: string, endTime: string} | null>(null);
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
    
    // Calculate current staff for this period
    const periodSlots = timeSlots.slice(period.start, period.end === 12 ? 12 : period.end);
    const currentStaff = Math.min(...periodSlots);
    
    // Always suggest the exact gap period
    const gapSuggestion = {
      start: startHour,
      end: endHour,
      startFormatted: `${startHour.toString().padStart(2, '0')}:00`,
      endFormatted: endHour === 7 ? "07:00" : `${endHour.toString().padStart(2, '0')}:00`,
      currentStaff: currentStaff,
      neededStaff: 2,
      type: 'gap'
    };
    
    suggestions.push(gapSuggestion);
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
      </CardContent>
    </Card>
    
    {/* Dialog for user selection */}
    {showDialog && (
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
    )}
  </>;
}