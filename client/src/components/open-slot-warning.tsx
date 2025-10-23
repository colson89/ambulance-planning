import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("0");
  const [pendingShift, setPendingShift] = useState<{startTime: string, endTime: string, shiftType: "day" | "night"} | null>(null);
  
  // Add Shift Dialog extended state
  const [addShiftType, setAddShiftType] = useState<"day" | "night">("night");
  const [addShiftTimeMode, setAddShiftTimeMode] = useState<"standard" | "custom">("custom");
  const [addShiftStandardDayType, setAddShiftStandardDayType] = useState<"full" | "morning" | "afternoon">("full");
  const [addShiftCustomStartTime, setAddShiftCustomStartTime] = useState("19:00");
  const [addShiftCustomEndTime, setAddShiftCustomEndTime] = useState("07:00");

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
  // Use hardcoded shift types instead of timestamp parsing to avoid timezone issues
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
      // Extract hour directly from ISO timestamp string to avoid timezone conversion
      // Example: "2025-11-08T07:00:00.000Z" -> extract "07"
      let startHour = 0;
      const timeString = shift.startTime.toString();
      const hourMatch = timeString.match(/T(\d{2}):/);
      if (hourMatch) {
        startHour = parseInt(hourMatch[1], 10);
      }

      // Morning split: 07:00-13:00
      // Brussels timezone: UTC+1 (winter) or UTC+2 (summer)
      // 07:00 Brussels = 06:00 UTC (winter) or 05:00 UTC (summer)
      if (startHour === 5 || startHour === 6 || startHour === 7) {
        morningStaff++;
      }
      // Afternoon split: 13:00-19:00
      // 13:00 Brussels = 12:00 UTC (winter) or 11:00 UTC (summer)
      else if (startHour === 11 || startHour === 12 || startHour === 13) {
        afternoonStaff++;
      }
    }
  });

  // === NIGHT SHIFT COVERAGE ANALYSIS (Hardcoded) ===
  // Simply count assigned night shifts (all night shifts are 19:00-07:00)
  const nightStaffCount = nightShifts.filter(shift => shift.userId !== 0).length;

  // === BUILD GAP SUGGESTIONS ===
  const suggestions: any[] = [];

  // 1. Check morning period (7:00-13:00)
  if (dayShifts.length > 0 && morningStaff < requiredDayStaff) {
    suggestions.push({
      period: 'morning',
      start: 7,
      end: 13,
      startFormatted: '07:00',
      endFormatted: '13:00',
      currentStaff: morningStaff,
      neededStaff: requiredDayStaff,
      type: 'gap',
      shiftType: 'day' as const
    });
  }

  // 2. Check afternoon period (13:00-19:00)
  if (dayShifts.length > 0 && afternoonStaff < requiredDayStaff) {
    suggestions.push({
      period: 'afternoon',
      start: 13,
      end: 19,
      startFormatted: '13:00',
      endFormatted: '19:00',
      currentStaff: afternoonStaff,
      neededStaff: requiredDayStaff,
      type: 'gap',
      shiftType: 'day' as const
    });
  }

  // 3. Check night period (19:00-07:00) - all night shifts are full period
  if (nightShifts.length > 0 && nightStaffCount < requiredStaff) {
    suggestions.push({
      period: 'night',
      start: 19,
      end: 7,
      startFormatted: '19:00',
      endFormatted: '07:00',
      currentStaff: nightStaffCount,
      neededStaff: requiredStaff,
      type: 'gap',
      shiftType: 'night' as const
    });
  }

  // Don't show warning if no gaps detected
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
                        ? `Geen dekking (${suggestion.neededStaff} ${suggestion.neededStaff === 1 ? 'persoon' : 'personen'} nodig)` 
                        : `${suggestion.currentStaff}/${suggestion.neededStaff} ${suggestion.neededStaff === 1 ? 'persoon' : 'personen'}`}
                    </span>
                  </div>
                  
                  {showAddButton && onAddShift && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPendingShift({
                          startTime: suggestion.startFormatted,
                          endTime: suggestion.endFormatted,
                          shiftType: suggestion.shiftType
                        });
                        // Reset dialog state
                        setAddShiftType(suggestion.shiftType);
                        setAddShiftTimeMode("custom");
                        setAddShiftCustomStartTime(suggestion.startFormatted);
                        setAddShiftCustomEndTime(suggestion.endFormatted);
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
      
      {/* Extended Add Shift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shift Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe shift toe voor {format(date, "dd MMMM yyyy", { locale: nl })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Shift Type Selectie */}
            <div className="grid gap-2">
              <Label>Shift Type</Label>
              <Select value={addShiftType} onValueChange={(value: "day" | "night") => setAddShiftType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dagshift</SelectItem>
                  <SelectItem value="night">Nachtshift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Tijd Mode Selectie */}
            <div className="grid gap-2">
              <Label>Tijden</Label>
              <Select value={addShiftTimeMode} onValueChange={(value: "standard" | "custom") => setAddShiftTimeMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standaard tijden</SelectItem>
                  <SelectItem value="custom">Custom tijden (noodgeval)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Standaard Dag Type (alleen voor dagshift met standaard tijden) */}
            {addShiftTimeMode === "standard" && addShiftType === "day" && (
              <div className="grid gap-2">
                <Label>Dagshift Variatie</Label>
                <Select value={addShiftStandardDayType} onValueChange={(value: "full" | "morning" | "afternoon") => setAddShiftStandardDayType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Volledige dag (07:00 - 19:00)</SelectItem>
                    <SelectItem value="morning">Voormiddag (07:00 - 13:00)</SelectItem>
                    <SelectItem value="afternoon">Namiddag (13:00 - 19:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Standaard Tijden Preview */}
            {addShiftTimeMode === "standard" && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {addShiftType === "night" && "Nachtshift: 19:00 - 07:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "full" && "Dagshift: 07:00 - 19:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "morning" && "Voormiddag: 07:00 - 13:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "afternoon" && "Namiddag: 13:00 - 19:00"}
                </p>
              </div>
            )}
            
            {/* Custom Tijd Pickers */}
            {addShiftTimeMode === "custom" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-time">Start Tijd</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={addShiftCustomStartTime}
                      onChange={(e) => setAddShiftCustomStartTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-time">Eind Tijd</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={addShiftCustomEndTime}
                      onChange={(e) => setAddShiftCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <strong>Let op:</strong> Custom tijden zijn bedoeld voor noodgevallen. Voor reguliere shifts gebruik standaard tijden.
                  </p>
                </div>
              </>
            )}
            
            {/* Ambulancier Toewijzing */}
            <div className="grid gap-2">
              <Label>Toewijzing</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Open Shift (niet toegewezen)</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {`${user.firstName} ${user.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => {
                if (onAddShift) {
                  let startTime = "";
                  let endTime = "";
                  
                  // Bepaal start en end tijd op basis van mode en type
                  if (addShiftTimeMode === "standard") {
                    if (addShiftType === "day") {
                      if (addShiftStandardDayType === "full") {
                        startTime = "07:00";
                        endTime = "19:00";
                      } else if (addShiftStandardDayType === "morning") {
                        startTime = "07:00";
                        endTime = "13:00";
                      } else if (addShiftStandardDayType === "afternoon") {
                        startTime = "13:00";
                        endTime = "19:00";
                      }
                    } else {
                      // night
                      startTime = "19:00";
                      endTime = "07:00";
                    }
                  } else {
                    // custom
                    startTime = addShiftCustomStartTime;
                    endTime = addShiftCustomEndTime;
                  }
                  
                  const userId = selectedUserId === "0" ? undefined : parseInt(selectedUserId);
                  onAddShift(date, startTime, endTime, userId);
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
