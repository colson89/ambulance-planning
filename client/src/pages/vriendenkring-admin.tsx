import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, LogOut, Users, Calendar, ClipboardList, Plus, Pencil, Trash2, 
  Euro, Settings, ChevronDown, ChevronRight, CheckCircle, XCircle, Mail, Send, Check,
  Shield, Key, UserPlus, RotateCcw, CreditCard
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface VkAdmin {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  memberId: number | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  member: {
    id: number;
    firstName: string;
    lastName: string;
    membershipTypeId: number;
  } | null;
  membershipType: {
    id: number;
    name: string;
  } | null;
}

interface VkMembershipType {
  id: number;
  name: string;
  description: string | null;
  annualFee: string | null;
  sortOrder: number;
}

interface VkMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  membershipTypeId: number;
  annualFeePaidUntil: number | null;
  isActive?: boolean;
  latestFeeStatus: {
    status: string;
    invitationSentAt: string | null;
    paidAt: string | null;
    amountDueCents: number;
  } | null;
  latestFeeCycleYear: number | null;
}

interface VkActivity {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

interface VkSubActivity {
  id: number;
  activityId: number;
  name: string;
  description: string | null;
  maxQuantity: number | null;
  sortOrder: number;
}

interface VkPricing {
  id: number;
  subActivityId: number;
  membershipTypeId: number;
  pricePerUnit: string;
}

interface VkActivityPricing {
  id: number;
  activityId: number;
  membershipTypeId: number;
  price: number;
}

interface VkRegistration {
  id: number;
  activityId: number;
  memberId: number | null;
  name: string;
  email: string;
  membershipTypeId: number;
  totalAmount: string;
  isPaid: boolean;
  createdAt: string;
}

interface VkInvitation {
  id: number;
  activityId: number;
  activityName: string | null;
  memberId: number;
  memberFirstName: string | null;
  memberLastName: string | null;
  email: string;
  subject: string;
  sentAt: string;
  openedAt: string | null;
  openCount: number;
}

interface VkMembershipFeeCycle {
  id: number;
  label: string;
  year: number;
  baseAmountCents: number;
  penaltyAmountCents: number;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
}

interface VkMembershipFeeInvitation {
  id: number;
  cycleId: number;
  memberId: number;
  memberFirstName: string | null;
  memberLastName: string | null;
  memberEmail: string | null;
  amountCents: number;
  status: "pending" | "overdue" | "paid" | "cancelled" | "declined";
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export default function VriendenkringAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("members");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<VkMember | null>(null);
  const [membershipTypeDialogOpen, setMembershipTypeDialogOpen] = useState(false);
  const [editingMembershipType, setEditingMembershipType] = useState<VkMembershipType | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<VkActivity | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<number | null>(null);
  const [subActivityDialogOpen, setSubActivityDialogOpen] = useState(false);
  const [editingSubActivity, setEditingSubActivity] = useState<VkSubActivity | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingSubActivityId, setPricingSubActivityId] = useState<number | null>(null);
  const [activityPricingDialogOpen, setActivityPricingDialogOpen] = useState(false);
  const [activityPrices, setActivityPrices] = useState<Record<number, string>>({});
  const [registrationFilter, setRegistrationFilter] = useState<string>("all");
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const [selectedInvitationActivity, setSelectedInvitationActivity] = useState<number | null>(null);
  const [selectedMembershipTypes, setSelectedMembershipTypes] = useState<number[]>([]);
  const [invitationSubject, setInvitationSubject] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedInvitationsActivity, setSelectedInvitationsActivity] = useState<number | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<VkAdmin | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<VkAdmin | null>(null);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [sendInvitationsDialogOpen, setSendInvitationsDialogOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const { data: admin, isLoading: adminLoading, error: adminError } = useQuery<VkAdmin>({
    queryKey: ["/api/vk/me"],
    retry: false,
  });

  useEffect(() => {
    if (!adminLoading && (adminError || !admin)) {
      setLocation("/VriendenkringMol");
    }
  }, [admin, adminLoading, adminError, setLocation]);

  const { data: members = [], isLoading: membersLoading } = useQuery<VkMember[]>({
    queryKey: ["/api/vk/members"],
    enabled: !!admin,
  });

  const { data: membershipTypes = [] } = useQuery<VkMembershipType[]>({
    queryKey: ["/api/vk/membership-types"],
    enabled: !!admin,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<VkActivity[]>({
    queryKey: ["/api/vk/activities"],
    enabled: !!admin,
  });

  const { data: registrations = [], isLoading: registrationsLoading } = useQuery<VkRegistration[]>({
    queryKey: ["/api/vk/registrations", registrationFilter],
    queryFn: async () => {
      const url = registrationFilter === "all" 
        ? "/api/vk/registrations"
        : `/api/vk/registrations?activityId=${registrationFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij ophalen inschrijvingen");
      return res.json();
    },
    enabled: !!admin,
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<VkInvitation[]>({
    queryKey: ["/api/vk/invitations"],
    enabled: !!admin,
  });

  const { data: vkAdmins = [], isLoading: adminsLoading } = useQuery<VkAdmin[]>({
    queryKey: ["/api/vk/admins"],
    enabled: !!admin,
  });

  const { data: feeCycles = [], isLoading: feeCyclesLoading } = useQuery<VkMembershipFeeCycle[]>({
    queryKey: ["/api/vk/membership-fee-cycles"],
    enabled: !!admin,
  });

  const { data: feeInvitations = [], isLoading: feeInvitationsLoading } = useQuery<VkMembershipFeeInvitation[]>({
    queryKey: ["/api/vk/membership-fee-cycles", selectedCycleId, "invitations"],
    queryFn: async () => {
      if (!selectedCycleId) return [];
      const res = await fetch(`/api/vk/membership-fee-cycles/${selectedCycleId}/invitations`, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij ophalen uitnodigingen");
      return res.json();
    },
    enabled: !!admin && !!selectedCycleId,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/vk/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/VriendenkringMol");
    },
  });

  const memberForm = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      membershipTypeId: "",
    },
  });

  const membershipTypeForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      annualFee: "",
      sortOrder: 0,
    },
  });

  const activityForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      isActive: true,
    },
  });

  const subActivityForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      maxQuantity: "",
      sortOrder: 0,
    },
  });

  const adminForm = useForm({
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      memberId: "none",
    },
  });

  const resetPasswordForm = useForm({
    defaultValues: {
      newPassword: "",
    },
  });

  const changePasswordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const cycleForm = useForm({
    defaultValues: {
      label: "",
      year: new Date().getFullYear().toString(),
      baseAmount: "",
      penaltyAmount: "",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (editingAdminUser) {
      adminForm.reset({
        username: editingAdminUser.username,
        password: "",
        firstName: editingAdminUser.firstName,
        lastName: editingAdminUser.lastName,
        email: editingAdminUser.email || "",
        memberId: editingAdminUser.memberId?.toString() || "none",
      });
    } else {
      adminForm.reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        memberId: "none",
      });
    }
  }, [editingAdminUser, adminForm]);

  useEffect(() => {
    resetPasswordForm.reset({ newPassword: "" });
  }, [resetPasswordAdmin, resetPasswordForm]);

  useEffect(() => {
    if (admin?.mustChangePassword) {
      setChangePasswordDialogOpen(true);
    }
  }, [admin]);

  useEffect(() => {
    if (editingMember) {
      memberForm.reset({
        firstName: editingMember.firstName,
        lastName: editingMember.lastName,
        email: editingMember.email,
        membershipTypeId: editingMember.membershipTypeId.toString(),
      });
    } else {
      memberForm.reset({
        firstName: "",
        lastName: "",
        email: "",
        membershipTypeId: "",
      });
    }
  }, [editingMember, memberForm]);

  useEffect(() => {
    if (editingMembershipType) {
      membershipTypeForm.reset({
        name: editingMembershipType.name,
        description: editingMembershipType.description || "",
        annualFee: editingMembershipType.annualFee || "",
        sortOrder: editingMembershipType.sortOrder,
      });
    } else {
      membershipTypeForm.reset({
        name: "",
        description: "",
        annualFee: "",
        sortOrder: 0,
      });
    }
  }, [editingMembershipType, membershipTypeForm]);

  useEffect(() => {
    if (editingActivity) {
      activityForm.reset({
        name: editingActivity.name,
        description: editingActivity.description || "",
        startDate: editingActivity.startDate ? format(new Date(editingActivity.startDate), "yyyy-MM-dd") : "",
        endDate: editingActivity.endDate ? format(new Date(editingActivity.endDate), "yyyy-MM-dd") : "",
        startTime: editingActivity.startTime || "",
        endTime: editingActivity.endTime || "",
        maxPersonsPerRegistration: editingActivity.maxPersonsPerRegistration?.toString() || "10",
        isActive: editingActivity.isActive,
      });
    } else {
      activityForm.reset({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        maxPersonsPerRegistration: "10",
        isActive: true,
      });
    }
  }, [editingActivity, activityForm]);

  useEffect(() => {
    if (editingSubActivity) {
      subActivityForm.reset({
        name: editingSubActivity.name,
        description: editingSubActivity.description || "",
        maxQuantityPerRegistration: editingSubActivity.maxQuantityPerRegistration?.toString() || "10",
        sortOrder: editingSubActivity.sortOrder,
      });
    } else {
      subActivityForm.reset({
        name: "",
        description: "",
        maxQuantityPerRegistration: "10",
        sortOrder: 0,
      });
    }
  }, [editingSubActivity, subActivityForm]);

  const saveMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingMember ? `/api/vk/members/${editingMember.id}` : "/api/vk/members";
      const method = editingMember ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          membershipTypeId: parseInt(data.membershipTypeId),
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij opslaan lid");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/members"] });
      setMemberDialogOpen(false);
      setEditingMember(null);
      toast({ title: "Lid opgeslagen" });
    },
    onError: () => {
      toast({ title: "Fout bij opslaan lid", variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vk/members/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Fout bij verwijderen lid");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/members"] });
      toast({ title: "Lid verwijderd" });
    },
  });

  const saveMembershipTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingMembershipType ? `/api/vk/membership-types/${editingMembershipType.id}` : "/api/vk/membership-types";
      const method = editingMembershipType ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij opslaan lidmaatschapstype");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/membership-types"] });
      setMembershipTypeDialogOpen(false);
      setEditingMembershipType(null);
      toast({ title: "Lidmaatschapstype opgeslagen" });
    },
  });

  const deleteMembershipTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vk/membership-types/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Fout bij verwijderen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/membership-types"] });
      toast({ title: "Lidmaatschapstype verwijderd" });
    },
  });

  const saveActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingActivity ? `/api/vk/activities/${editingActivity.id}` : "/api/vk/activities";
      const method = editingActivity ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
          endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
          startTime: data.startTime || null,
          endTime: data.endTime || null,
          registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : null,
          maxPersonsPerRegistration: data.maxPersonsPerRegistration ? parseInt(data.maxPersonsPerRegistration) : 10,
          isActive: data.isActive,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij opslaan activiteit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/activities"] });
      setActivityDialogOpen(false);
      setEditingActivity(null);
      toast({ title: "Activiteit opgeslagen" });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vk/activities/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Fout bij verwijderen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/activities"] });
      toast({ title: "Activiteit verwijderd" });
    },
  });

  const saveSubActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingSubActivity 
        ? `/api/vk/sub-activities/${editingSubActivity.id}` 
        : `/api/vk/activities/${expandedActivityId}/sub-activities`;
      const method = editingSubActivity ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          sortOrder: data.sortOrder || 0,
          maxQuantityPerRegistration: data.maxQuantityPerRegistration ? parseInt(data.maxQuantityPerRegistration) : 10,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij opslaan deelactiviteit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/activities", expandedActivityId] });
      setSubActivityDialogOpen(false);
      setEditingSubActivity(null);
      toast({ title: "Deelactiviteit opgeslagen" });
    },
  });

  const deleteSubActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vk/sub-activities/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Fout bij verwijderen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/activities", expandedActivityId] });
      toast({ title: "Deelactiviteit verwijderd" });
    },
  });

  const savePricingMutation = useMutation({
    mutationFn: async ({ membershipTypeId, pricePerUnit }: { membershipTypeId: number; pricePerUnit: string }) => {
      const priceInCents = Math.round(parseFloat(pricePerUnit) * 100);
      const res = await fetch(`/api/vk/sub-activities/${pricingSubActivityId}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipTypeId, pricePerUnit: priceInCents }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij opslaan prijs");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/activities", expandedActivityId] });
      toast({ title: "Prijs opgeslagen" });
    },
  });

  const togglePaymentMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: number; isPaid: boolean }) => {
      const res = await fetch(`/api/vk/registrations/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij bijwerken betaling");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/registrations"] });
    },
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vk/send-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: selectedInvitationActivity,
          membershipTypeIds: selectedMembershipTypes,
          subject: invitationSubject,
          message: invitationMessage,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fout bij verzenden");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/invitations"] });
      toast({ 
        title: "Uitnodigingen verzonden", 
        description: data.message 
      });
      setInvitationDialogOpen(false);
      setSelectedInvitationActivity(null);
      setSelectedMembershipTypes([]);
      setInvitationSubject("");
      setInvitationMessage("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Fout bij verzenden", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const { data: activityDetails } = useQuery<{ subActivities: VkSubActivity[]; pricing: VkPricing[]; activityPricing: VkActivityPricing[] }>({
    queryKey: ["/api/vk/activities", expandedActivityId],
    queryFn: async () => {
      const res = await fetch(`/api/vk/activities/${expandedActivityId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij ophalen activiteit details");
      return res.json();
    },
    enabled: !!expandedActivityId,
  });

  const saveActivityPricingMutation = useMutation({
    mutationFn: async () => {
      if (!expandedActivityId) return;
      const prices = Object.entries(activityPrices)
        .filter(([_, price]) => price !== "" && price !== null && price !== undefined)
        .map(([membershipTypeId, price]) => ({
          membershipTypeId: parseInt(membershipTypeId),
          price: parseFloat(price)
        }));
      
      const res = await fetch(`/api/vk/activities/${expandedActivityId}/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij opslaan prijzen");
      return res.json();
    },
    onSuccess: async (updatedPricing: VkActivityPricing[]) => {
      queryClient.setQueryData(
        ["/api/vk/activities", expandedActivityId],
        (oldData: any) => oldData ? { ...oldData, activityPricing: updatedPricing } : oldData
      );
      await queryClient.invalidateQueries({ queryKey: ["/api/vk/activities"] });
      toast({ title: "Prijzen opgeslagen" });
      setActivityPricingDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij opslaan", description: error.message, variant: "destructive" });
    },
  });

  const saveAdminMutation = useMutation({
    mutationFn: async (data: { username: string; password?: string; firstName: string; lastName: string; email: string; memberId: string }) => {
      const memberId = data.memberId && data.memberId !== "none" ? parseInt(data.memberId) : null;
      if (editingAdminUser) {
        const res = await fetch(`/api/vk/admins/${editingAdminUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            memberId,
          }),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Fout bij bijwerken administrator");
        }
        return res.json();
      } else {
        const res = await fetch("/api/vk/admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, memberId }),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Fout bij aanmaken administrator");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/admins"] });
      toast({ title: editingAdminUser ? "Administrator bijgewerkt" : "Administrator aangemaakt" });
      setAdminDialogOpen(false);
      setEditingAdminUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const toggleAdminActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/vk/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fout bij wijzigen status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/admins"] });
      toast({ title: "Status gewijzigd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const resetAdminPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const res = await fetch(`/api/vk/admins/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fout bij resetten wachtwoord");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/admins"] });
      toast({ title: "Wachtwoord gereset", description: "Gebruiker moet wachtwoord wijzigen bij volgende login" });
      setResetPasswordDialogOpen(false);
      setResetPasswordAdmin(null);
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const changeOwnPasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/vk/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fout bij wijzigen wachtwoord");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/me"] });
      toast({ title: "Wachtwoord gewijzigd" });
      setChangePasswordDialogOpen(false);
      changePasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const createCycleMutation = useMutation({
    mutationFn: async (data: { label: string; year: string; baseAmount: string; penaltyAmount: string; dueDate: string }) => {
      const res = await fetch("/api/vk/membership-fee-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: data.label,
          year: parseInt(data.year),
          baseAmountCents: Math.round(parseFloat(data.baseAmount) * 100),
          penaltyAmountCents: Math.round(parseFloat(data.penaltyAmount || "0") * 100),
          dueDate: data.dueDate,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fout bij aanmaken cyclus");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/membership-fee-cycles"] });
      toast({ title: "Lidgeld cyclus aangemaakt" });
      setCycleDialogOpen(false);
      cycleForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const sendFeeInvitationsMutation = useMutation({
    mutationFn: async ({ cycleId, memberIds }: { cycleId: number; memberIds: number[] }) => {
      const res = await fetch(`/api/vk/membership-fee-cycles/${cycleId}/send-invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fout bij verzenden uitnodigingen");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/membership-fee-cycles", selectedCycleId, "invitations"] });
      toast({ title: "Uitnodigingen verzonden", description: data.message });
      setSendInvitationsDialogOpen(false);
      setSelectedMemberIds([]);
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const markFeeAsPaidMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await fetch(`/api/vk/membership-fee-invitations/${invitationId}/mark-paid`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fout bij markeren als betaald");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/membership-fee-cycles", selectedCycleId, "invitations"] });
      toast({ title: "Gemarkeerd als betaald" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const cancelFeeInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await fetch(`/api/vk/membership-fee-invitations/${invitationId}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fout bij annuleren uitnodiging");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vk/membership-fee-cycles", selectedCycleId, "invitations"] });
      toast({ title: "Uitnodiging geannuleerd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const openActivityPricingDialog = () => {
    const prices: Record<number, string> = {};
    membershipTypes.forEach(mt => {
      const existing = activityDetails?.activityPricing?.find(ap => ap.membershipTypeId === mt.id);
      prices[mt.id] = existing ? (existing.price / 100).toFixed(2) : "";
    });
    setActivityPrices(prices);
    setActivityPricingDialogOpen(true);
  };

  const getMembershipTypeName = (id: number) => {
    return membershipTypes.find((t) => t.id === id)?.name || "Onbekend";
  };

  const getActivityName = (id: number) => {
    return activities.find((a) => a.id === id)?.name || "Onbekend";
  };

  const stats = {
    totalMembers: members.length,
    activeActivities: activities.filter((a) => a.isActive).length,
    unpaidRegistrations: registrations.filter((r) => !r.isPaid).length,
    totalUnpaidAmount: registrations
      .filter((r) => !r.isPaid)
      .reduce((sum, r) => sum + parseFloat(r.totalAmount), 0),
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Vriendenkring Mol</h1>
                <p className="text-sm text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Leden</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeActivities}</p>
                  <p className="text-sm text-muted-foreground">Actieve activiteiten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unpaidRegistrations}</p>
                  <p className="text-sm text-muted-foreground">Openstaande betalingen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <Euro className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">€{stats.totalUnpaidAmount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Te ontvangen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="members">
                  <Users className="h-4 w-4 mr-2" />
                  Leden
                </TabsTrigger>
                <TabsTrigger value="activities">
                  <Calendar className="h-4 w-4 mr-2" />
                  Activiteiten
                </TabsTrigger>
                <TabsTrigger value="registrations">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Inschrijvingen
                </TabsTrigger>
                <TabsTrigger value="invitations">
                  <Mail className="h-4 w-4 mr-2" />
                  Uitnodigingen
                </TabsTrigger>
                <TabsTrigger value="administrators">
                  <Shield className="h-4 w-4 mr-2" />
                  Beheerders
                </TabsTrigger>
                <TabsTrigger value="lidgeld">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Lidgeld
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="members" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditingMember(null); setMemberDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Lid toevoegen
                    </Button>
                    <Button variant="outline" onClick={() => { setEditingMembershipType(null); setMembershipTypeDialogOpen(true); }}>
                      <Settings className="h-4 w-4 mr-2" />
                      Lidmaatschapstypes
                    </Button>
                  </div>
                </div>

                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Lidmaatschap</TableHead>
                        <TableHead>Lidgeld</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.firstName} {member.lastName}
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getMembershipTypeName(member.membershipTypeId)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.latestFeeStatus ? (
                              member.latestFeeStatus.status === "paid" ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Betaald {member.latestFeeCycleYear}
                                </Badge>
                              ) : member.latestFeeStatus.status === "declined" ? (
                                <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Geen lid
                                </Badge>
                              ) : member.latestFeeStatus.status === "overdue" ? (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Achterstallig
                                </Badge>
                              ) : member.latestFeeStatus.status === "pending" ? (
                                member.latestFeeStatus.invitationSentAt ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                    <Mail className="h-3 w-3 mr-1" />
                                    Verzonden
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    Wacht op verzending
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline">
                                  {member.latestFeeStatus.status}
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Geen uitnodiging
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingMember(member); setMemberDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Weet je zeker dat je dit lid wilt verwijderen?")) {
                                  deleteMemberMutation.mutate(member.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {members.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nog geen leden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <Button onClick={() => { setEditingActivity(null); setActivityDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Activiteit toevoegen
                  </Button>
                </div>

                {activitiesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedActivityId(expandedActivityId === activity.id ? null : activity.id)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedActivityId === activity.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div>
                              <div className="font-medium">{activity.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {activity.startDate && format(new Date(activity.startDate), "d MMMM yyyy", { locale: nl })}
                                {activity.startTime && ` om ${activity.startTime}`}
                                {activity.endTime && ` - ${activity.endTime}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={activity.isActive ? "default" : "secondary"}>
                              {activity.isActive ? "Actief" : "Inactief"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); setEditingActivity(activity); setActivityDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Weet je zeker dat je deze activiteit wilt verwijderen?")) {
                                  deleteActivityMutation.mutate(activity.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {expandedActivityId === activity.id && (
                          <div className="border-t p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">Deelactiviteiten</h4>
                              <Button
                                size="sm"
                                onClick={() => { setEditingSubActivity(null); setSubActivityDialogOpen(true); }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Toevoegen
                              </Button>
                            </div>

                            {activityDetails?.subActivities?.length ? (
                              <div className="space-y-2">
                                {activityDetails.subActivities.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between p-3 bg-background rounded-md border">
                                    <div>
                                      <div className="font-medium">{sub.name}</div>
                                      {sub.description && (
                                        <div className="text-sm text-muted-foreground">{sub.description}</div>
                                      )}
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Prijzen:{" "}
                                        {membershipTypes.map((mt) => {
                                          const price = activityDetails.pricing?.find(
                                            (p) => p.subActivityId === sub.id && p.membershipTypeId === mt.id
                                          );
                                          return price ? (
                                            <span key={mt.id} className="mr-2">
                                              {mt.name}: €{(Number(price.pricePerUnit) / 100).toFixed(2)}
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setPricingSubActivityId(sub.id); setPricingDialogOpen(true); }}
                                      >
                                        <Euro className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setEditingSubActivity(sub); setSubActivityDialogOpen(true); }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          if (confirm("Weet je zeker dat je deze deelactiviteit wilt verwijderen?")) {
                                            deleteSubActivityMutation.mutate(sub.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Geen deelactiviteiten</p>
                            )}

                            {/* Direct Activity Pricing Section */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium">Directe Prijzen (voor activiteiten zonder deelactiviteiten)</h4>
                                <Button size="sm" variant="outline" onClick={openActivityPricingDialog}>
                                  <Euro className="h-4 w-4 mr-1" />
                                  Prijzen instellen
                                </Button>
                              </div>
                              {activityDetails?.activityPricing?.length ? (
                                <div className="text-sm text-muted-foreground">
                                  {membershipTypes.map((mt) => {
                                    const price = activityDetails.activityPricing.find(ap => ap.membershipTypeId === mt.id);
                                    return price ? (
                                      <span key={mt.id} className="mr-3">
                                        {mt.name}: €{(price.price / 100).toFixed(2)}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Geen directe prijzen ingesteld</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Nog geen activiteiten
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="registrations" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <Select value={registrationFilter} onValueChange={setRegistrationFilter}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter op activiteit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle activiteiten</SelectItem>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id.toString()}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {registrationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-4 bg-muted/50 rounded-lg flex gap-8">
                      <div>
                        <span className="text-sm text-muted-foreground">Totaal inschrijvingen:</span>
                        <span className="ml-2 font-semibold">{registrations.length}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Betaald:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          €{registrations.filter((r) => r.isPaid).reduce((s, r) => s + parseFloat(r.totalAmount), 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Openstaand:</span>
                        <span className="ml-2 font-semibold text-red-600">
                          €{registrations.filter((r) => !r.isPaid).reduce((s, r) => s + parseFloat(r.totalAmount), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Activiteit</TableHead>
                          <TableHead>Lidmaatschap</TableHead>
                          <TableHead>Bedrag</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Datum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations.map((reg) => (
                          <TableRow key={reg.id} className={reg.isPaid ? "" : "bg-red-50 dark:bg-red-950/20"}>
                            <TableCell className="font-medium">{reg.name}</TableCell>
                            <TableCell>{reg.email}</TableCell>
                            <TableCell>{getActivityName(reg.activityId)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getMembershipTypeName(reg.membershipTypeId)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">€{parseFloat(reg.totalAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={reg.isPaid 
                                  ? "text-green-600 hover:text-green-700" 
                                  : "text-red-600 hover:text-red-700"
                                }
                                onClick={() => togglePaymentMutation.mutate({ id: reg.id, isPaid: !reg.isPaid })}
                              >
                                {reg.isPaid ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Betaald
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Niet betaald
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(reg.createdAt), "d MMM yyyy", { locale: nl })}
                            </TableCell>
                          </TableRow>
                        ))}
                        {registrations.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              Geen inschrijvingen gevonden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </TabsContent>

              <TabsContent value="invitations" className="mt-0">
                <div className="space-y-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Uitnodigingen verzenden
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Activiteit</Label>
                        <Select
                          value={selectedInvitationActivity?.toString() || ""}
                          onValueChange={(v) => setSelectedInvitationActivity(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer een activiteit" />
                          </SelectTrigger>
                          <SelectContent>
                            {activities.filter(a => a.isActive).map((activity) => (
                              <SelectItem key={activity.id} value={activity.id.toString()}>
                                {activity.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Categorieën (naar wie te sturen)</Label>
                        <div className="border rounded-md p-3 space-y-2">
                          {membershipTypes.map((type) => (
                            <div key={type.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`mt-${type.id}`}
                                checked={selectedMembershipTypes.includes(type.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMembershipTypes([...selectedMembershipTypes, type.id]);
                                  } else {
                                    setSelectedMembershipTypes(selectedMembershipTypes.filter(id => id !== type.id));
                                  }
                                }}
                              />
                              <label htmlFor={`mt-${type.id}`} className="text-sm cursor-pointer">
                                {type.name}
                                <span className="text-muted-foreground ml-2">
                                  ({members.filter(m => m.membershipTypeId === type.id && m.email).length} leden met e-mail)
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Onderwerp</Label>
                        <Input
                          value={invitationSubject}
                          onChange={(e) => setInvitationSubject(e.target.value)}
                          placeholder="bv. Uitnodiging Sint Barbara 2025"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Bericht</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const selectedActivity = activities.find(a => a.id === selectedInvitationActivity);
                              setInvitationSubject(`Uitnodiging ${selectedActivity?.name || "activiteit"}`);
                              setInvitationMessage(`Beste {voornaam},

Graag nodigen wij je uit voor ${selectedActivity?.name || "onze activiteit"}.

Als {lidtype} ben je van harte welkom!

We kijken ernaar uit je te verwelkomen.

Met vriendelijke groeten,
Vriendenkring VZW Brandweer Mol`);
                            }}
                            disabled={!selectedInvitationActivity}
                          >
                            Standaard template
                          </Button>
                        </div>
                        <Textarea
                          value={invitationMessage}
                          onChange={(e) => setInvitationMessage(e.target.value)}
                          placeholder="Beste {voornaam}, ..."
                          rows={6}
                        />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Beschikbare variabelen: <code className="bg-muted px-1 rounded">{"{voornaam}"}</code> en <code className="bg-muted px-1 rounded">{"{lidtype}"}</code></p>
                          <p>Een link naar het inschrijfformulier wordt automatisch toegevoegd.</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setPreviewDialogOpen(true)}
                          disabled={
                            !selectedInvitationActivity ||
                            !invitationSubject ||
                            !invitationMessage
                          }
                          className="flex-1"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          onClick={() => sendInvitationsMutation.mutate()}
                          disabled={
                            !selectedInvitationActivity ||
                            selectedMembershipTypes.length === 0 ||
                            !invitationSubject ||
                            !invitationMessage ||
                            sendInvitationsMutation.isPending
                          }
                          className="flex-1"
                        >
                          {sendInvitationsMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Verzenden...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Verzenden
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Verzonden uitnodigingen
                    </h3>
                    
                    <div className="mb-4">
                      <Select 
                        value={selectedInvitationsActivity?.toString() || "all"} 
                        onValueChange={(val) => setSelectedInvitationsActivity(val === "all" ? null : parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter op activiteit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle activiteiten</SelectItem>
                          {activities.map((act) => {
                            const count = invitations.filter(i => i.activityId === act.id).length;
                            return (
                              <SelectItem key={act.id} value={act.id.toString()}>
                                {act.name} ({count} uitnodigingen)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {invitationsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : invitations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nog geen uitnodigingen verzonden
                      </p>
                    ) : (() => {
                      const filteredInvitations = selectedInvitationsActivity 
                        ? invitations.filter(i => i.activityId === selectedInvitationsActivity)
                        : invitations;
                      
                      if (filteredInvitations.length === 0) {
                        return (
                          <p className="text-muted-foreground text-center py-8">
                            Geen uitnodigingen voor deze activiteit
                          </p>
                        );
                      }
                      
                      return (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {!selectedInvitationsActivity && <TableHead>Activiteit</TableHead>}
                              <TableHead>Lid</TableHead>
                              <TableHead>E-mail</TableHead>
                              <TableHead>Verzonden</TableHead>
                              <TableHead>Geopend</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredInvitations.map((inv) => (
                              <TableRow key={inv.id}>
                                {!selectedInvitationsActivity && (
                                  <TableCell className="font-medium">
                                    {inv.activityName || "Onbekend"}
                                  </TableCell>
                                )}
                                <TableCell>
                                  {inv.memberFirstName} {inv.memberLastName}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {inv.email}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(inv.sentAt), "d MMM yyyy HH:mm", { locale: nl })}
                                </TableCell>
                                <TableCell>
                                  {inv.openedAt ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <Check className="h-4 w-4" />
                                      {format(new Date(inv.openedAt), "d MMM HH:mm", { locale: nl })}
                                      {inv.openCount > 1 && (
                                        <span className="text-xs text-muted-foreground">
                                          ({inv.openCount}x)
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground mt-4">
                      Let op: sommige e-mailprogramma's blokkeren afbeeldingen, waardoor de open-status niet altijd kan worden geregistreerd.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="administrators" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditingAdminUser(null); setAdminDialogOpen(true); }}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Beheerder toevoegen
                    </Button>
                    <Button variant="outline" onClick={() => setChangePasswordDialogOpen(true)}>
                      <Key className="h-4 w-4 mr-2" />
                      Mijn wachtwoord wijzigen
                    </Button>
                  </div>
                </div>

                {adminsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Gebruikersnaam</TableHead>
                        <TableHead>Lidmaatschapstype</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vkAdmins.map((adminUser) => (
                        <TableRow key={adminUser.id}>
                          <TableCell className="font-medium">
                            {adminUser.firstName} {adminUser.lastName}
                          </TableCell>
                          <TableCell>{adminUser.username}</TableCell>
                          <TableCell>
                            {adminUser.membershipType?.name || (
                              <span className="text-muted-foreground">Niet gekoppeld</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {adminUser.email || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {adminUser.isActive ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Actief
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactief
                                </Badge>
                              )}
                              {adminUser.mustChangePassword && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  <Key className="h-3 w-3 mr-1" />
                                  Wachtwoord wijzigen
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setEditingAdminUser(adminUser); setAdminDialogOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setResetPasswordAdmin(adminUser); setResetPasswordDialogOpen(true); }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              {adminUser.id !== admin?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleAdminActiveMutation.mutate({ 
                                    id: adminUser.id, 
                                    isActive: !adminUser.isActive 
                                  })}
                                >
                                  {adminUser.isActive ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="lidgeld" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <Button onClick={() => { cycleForm.reset(); setCycleDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuwe cyclus
                    </Button>
                    {selectedCycleId && (
                      <Button variant="outline" onClick={() => setSendInvitationsDialogOpen(true)}>
                        <Send className="h-4 w-4 mr-2" />
                        Uitnodigingen verzenden
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold mb-3">Lidgeld Cycli</h3>
                    {feeCyclesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : feeCycles.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nog geen lidgeld cycli
                      </p>
                    ) : (
                      feeCycles.map((cycle) => (
                        <div
                          key={cycle.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedCycleId === cycle.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedCycleId(cycle.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{cycle.label}</div>
                              <div className="text-sm text-muted-foreground">
                                Jaar: {cycle.year}
                              </div>
                            </div>
                            {cycle.isActive ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Actief
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactief</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Basisbedrag: €{(cycle.baseAmountCents / 100).toFixed(2)}
                            {cycle.penaltyAmountCents > 0 && (
                              <span> | Boete: €{(cycle.penaltyAmountCents / 100).toFixed(2)}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Vervaldatum: {format(new Date(cycle.dueDate), "d MMM yyyy", { locale: nl })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="md:col-span-2">
                    {selectedCycleId ? (
                      <div>
                        <h3 className="font-semibold mb-3">Uitnodigingen</h3>
                        {feeInvitationsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : feeInvitations.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            Nog geen uitnodigingen voor deze cyclus
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Lid</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Bedrag</TableHead>
                                <TableHead className="text-right">Acties</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {feeInvitations.map((inv) => (
                                <TableRow key={inv.id}>
                                  <TableCell className="font-medium">
                                    {inv.memberFirstName} {inv.memberLastName}
                                    {inv.memberEmail && (
                                      <div className="text-xs text-muted-foreground">{inv.memberEmail}</div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {inv.status === "pending" && (
                                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                        In afwachting
                                      </Badge>
                                    )}
                                    {inv.status === "overdue" && (
                                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                        Achterstallig
                                      </Badge>
                                    )}
                                    {inv.status === "paid" && (
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                        Betaald
                                      </Badge>
                                    )}
                                    {inv.status === "cancelled" && (
                                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                        Geannuleerd
                                      </Badge>
                                    )}
                                    {inv.status === "declined" && (
                                      <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                                        Geen lid
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    €{(inv.amountCents / 100).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "declined" && (
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => markFeeAsPaidMutation.mutate(inv.id)}
                                          disabled={markFeeAsPaidMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Betaald
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm("Weet je zeker dat je deze uitnodiging wilt annuleren?")) {
                                              cancelFeeInvitationMutation.mutate(inv.id);
                                            }
                                          }}
                                          disabled={cancelFeeInvitationMutation.isPending}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Annuleren
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Selecteer een cyclus om de uitnodigingen te bekijken
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </main>

      <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe lidgeld cyclus</DialogTitle>
            <DialogDescription>
              Maak een nieuwe cyclus aan voor het innen van lidgeld
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={cycleForm.handleSubmit((data) => createCycleMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input {...cycleForm.register("label", { required: true })} placeholder="bv. Lidgeld 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jaar</Label>
                <Input type="number" {...cycleForm.register("year", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Vervaldatum</Label>
                <Input type="date" {...cycleForm.register("dueDate", { required: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basisbedrag (€)</Label>
                <Input type="number" step="0.01" {...cycleForm.register("baseAmount", { required: true })} placeholder="25.00" />
              </div>
              <div className="space-y-2">
                <Label>Boetebedrag (€) optioneel</Label>
                <Input type="number" step="0.01" {...cycleForm.register("penaltyAmount")} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createCycleMutation.isPending}>
                {createCycleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sendInvitationsDialogOpen} onOpenChange={setSendInvitationsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lidgeld uitnodigingen verzenden</DialogTitle>
            <DialogDescription>
              Selecteer leden om uitnodigingen te versturen, of verzend naar alle leden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {members.filter(m => m.isActive !== false).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b last:border-b-0"
                >
                  <Checkbox
                    checked={selectedMemberIds.includes(member.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMemberIds([...selectedMemberIds, member.id]);
                      } else {
                        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== member.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </div>
                  <Badge variant="secondary">
                    {getMembershipTypeName(member.membershipTypeId)}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedMemberIds.length > 0
                  ? `${selectedMemberIds.length} leden geselecteerd`
                  : "Geen leden geselecteerd - uitnodigingen worden naar alle leden verzonden"}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMemberIds(members.filter(m => m.isActive !== false).map((m) => m.id))}
                >
                  Alles selecteren
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMemberIds([])}
                >
                  Deselecteren
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendInvitationsDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => {
                if (selectedCycleId) {
                  sendFeeInvitationsMutation.mutate({
                    cycleId: selectedCycleId,
                    memberIds: selectedMemberIds,
                  });
                }
              }}
              disabled={sendFeeInvitationsMutation.isPending}
            >
              {sendFeeInvitationsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              {selectedMemberIds.length > 0
                ? `Verzend naar ${selectedMemberIds.length} leden`
                : "Verzend naar alle leden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? "Lid bewerken" : "Nieuw lid"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={memberForm.handleSubmit((data) => saveMemberMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voornaam</Label>
                <Input {...memberForm.register("firstName", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Achternaam</Label>
                <Input {...memberForm.register("lastName", { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...memberForm.register("email", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Lidmaatschapstype</Label>
              <Select
                value={memberForm.watch("membershipTypeId")}
                onValueChange={(v) => memberForm.setValue("membershipTypeId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer type" />
                </SelectTrigger>
                <SelectContent>
                  {membershipTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveMemberMutation.isPending}>
                {saveMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={membershipTypeDialogOpen} onOpenChange={setMembershipTypeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lidmaatschapstypes beheren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">{editingMembershipType ? "Type bewerken" : "Nieuw type"}</h4>
              <form onSubmit={membershipTypeForm.handleSubmit((data) => saveMembershipTypeMutation.mutate(data))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Naam</Label>
                    <Input {...membershipTypeForm.register("name", { required: true })} placeholder="bv. Lid, Symphatisant" />
                  </div>
                  <div className="space-y-2">
                    <Label>Jaarlijks lidgeld</Label>
                    <Input {...membershipTypeForm.register("annualFee")} placeholder="bv. 25.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Beschrijving</Label>
                  <Input {...membershipTypeForm.register("description")} placeholder="Optionele beschrijving" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saveMembershipTypeMutation.isPending}>
                    {saveMembershipTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingMembershipType ? "Bijwerken" : "Toevoegen"}
                  </Button>
                  {editingMembershipType && (
                    <Button type="button" variant="outline" onClick={() => setEditingMembershipType(null)}>
                      Annuleren
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Bestaande types</h4>
              {membershipTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">{type.name}</div>
                    {type.annualFee && (
                      <div className="text-sm text-muted-foreground">Lidgeld: €{parseFloat(type.annualFee).toFixed(2)}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingMembershipType(type)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Weet je zeker dat je dit type wilt verwijderen?")) {
                          deleteMembershipTypeMutation.mutate(type.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {membershipTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nog geen lidmaatschapstypes</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Activiteit bewerken" : "Nieuwe activiteit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={activityForm.handleSubmit((data) => saveActivityMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input {...activityForm.register("name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Textarea {...activityForm.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input type="date" {...activityForm.register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>Einddatum (optioneel)</Label>
                <Input type="date" {...activityForm.register("endDate")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startuur (optioneel)</Label>
                <Input type="time" {...activityForm.register("startTime")} />
              </div>
              <div className="space-y-2">
                <Label>Einduur (optioneel)</Label>
                <Input type="time" {...activityForm.register("endTime")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max. personen per inschrijving</Label>
              <Input type="number" {...activityForm.register("maxPersonsPerRegistration")} placeholder="10" />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={activityForm.watch("isActive")}
                onCheckedChange={(v) => activityForm.setValue("isActive", v)}
              />
              <Label>Inschrijving open</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveActivityMutation.isPending}>
                {saveActivityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subActivityDialogOpen} onOpenChange={setSubActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubActivity ? "Deelactiviteit bewerken" : "Nieuwe deelactiviteit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={subActivityForm.handleSubmit((data) => saveSubActivityMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input {...subActivityForm.register("name", { required: true })} placeholder="bv. Volwassene, Kind, Maaltijd" />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving (optioneel)</Label>
              <Input {...subActivityForm.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Max. personen per inschrijving</Label>
              <Input type="number" {...subActivityForm.register("maxQuantityPerRegistration")} placeholder="10" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveSubActivityMutation.isPending}>
                {saveSubActivityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prijzen instellen</DialogTitle>
            <DialogDescription>
              Prijzen worden automatisch opgeslagen bij elke wijziging
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {membershipTypes.map((type) => {
              const existingPrice = activityDetails?.pricing?.find(
                (p) => p.subActivityId === pricingSubActivityId && p.membershipTypeId === type.id
              );
              return (
                <div key={type.id} className="flex items-center gap-4">
                  <Label className="w-32">{type.name}</Label>
                  <div className="flex items-center gap-2 flex-1">
                    <span>€</span>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={existingPrice ? (Number(existingPrice.pricePerUnit) / 100).toFixed(2) : ""}
                      placeholder="0.00"
                      onBlur={(e) => {
                        if (e.target.value) {
                          savePricingMutation.mutate({
                            membershipTypeId: type.id,
                            pricePerUnit: e.target.value,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activityPricingDialogOpen} onOpenChange={setActivityPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Directe Activiteit Prijzen</DialogTitle>
            <DialogDescription>
              Stel prijzen in voor activiteiten zonder deelactiviteiten (bv. lidgeld, nieuwjaarsreceptie)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {membershipTypes.map((type) => (
              <div key={type.id} className="flex items-center gap-4">
                <Label className="w-32">{type.name}</Label>
                <div className="flex items-center gap-2 flex-1">
                  <span>€</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={activityPrices[type.id] || ""}
                    placeholder="0.00"
                    onChange={(e) => setActivityPrices(prev => ({ ...prev, [type.id]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityPricingDialogOpen(false)}>Annuleren</Button>
            <Button onClick={() => saveActivityPricingMutation.mutate()} disabled={saveActivityPricingMutation.isPending}>
              {saveActivityPricingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>E-mail Preview</DialogTitle>
            <DialogDescription>
              Dit is een voorbeeld van hoe de uitnodiging eruit ziet (variabelen worden vervangen)
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div className="border-b pb-2 mb-4">
              <div className="flex gap-2">
                <span className="font-semibold text-sm text-muted-foreground w-16">Aan:</span>
                <span className="text-sm">jan.voorbeeld@email.be</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-sm text-muted-foreground w-16">Onderwerp:</span>
                <span className="text-sm font-medium">{invitationSubject}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="whitespace-pre-wrap text-sm">
                {invitationMessage
                  .replace(/\{voornaam\}/g, "Jan")
                  .replace(/\{lidtype\}/g, membershipTypes[0]?.name || "Lid VZW")}
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Automatisch toegevoegde inschrijflink:
                </p>
                <a 
                  href={`/VriendenkringMol/inschrijven?preview=true&name=${encodeURIComponent("Jan Voorbeeld")}&email=${encodeURIComponent("jan.voorbeeld@email.be")}&membershipTypeId=${membershipTypes[0]?.id || 1}${selectedInvitationActivity ? `&activity=${selectedInvitationActivity}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-primary/90"
                >
                  Inschrijven voor {activities.find(a => a.id === selectedInvitationActivity)?.name || "activiteit"}
                </a>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdminUser ? "Beheerder bewerken" : "Nieuwe beheerder"}</DialogTitle>
            <DialogDescription>
              {editingAdminUser 
                ? "Wijzig de gegevens van de beheerder"
                : "Maak een nieuw beheerders account aan"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={adminForm.handleSubmit((data) => saveAdminMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voornaam</Label>
                <Input {...adminForm.register("firstName", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Achternaam</Label>
                <Input {...adminForm.register("lastName", { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gebruikersnaam</Label>
              <Input 
                {...adminForm.register("username", { required: true })} 
                disabled={!!editingAdminUser}
              />
              {editingAdminUser && (
                <p className="text-xs text-muted-foreground">
                  Gebruikersnaam kan niet worden gewijzigd
                </p>
              )}
            </div>
            {!editingAdminUser && (
              <div className="space-y-2">
                <Label>Initieel wachtwoord</Label>
                <Input 
                  type="password" 
                  {...adminForm.register("password", { required: !editingAdminUser, minLength: 6 })} 
                />
                <p className="text-xs text-muted-foreground">
                  Gebruiker moet wachtwoord wijzigen bij eerste login
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>E-mail (optioneel)</Label>
              <Input type="email" {...adminForm.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Gekoppeld lid (optioneel)</Label>
              <Select 
                value={adminForm.watch("memberId")} 
                onValueChange={(value) => adminForm.setValue("memberId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een lid..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen koppeling</SelectItem>
                  {members
                    .filter(m => m.isActive !== false)
                    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.lastName} {member.firstName} - {membershipTypes.find(t => t.id === member.membershipTypeId)?.name || "Onbekend"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Koppel deze beheerder aan een lid om het lidmaatschapstype te tonen
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveAdminMutation.isPending}>
                {saveAdminMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAdminUser ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wachtwoord resetten</DialogTitle>
            <DialogDescription>
              Reset het wachtwoord voor {resetPasswordAdmin?.firstName} {resetPasswordAdmin?.lastName}
            </DialogDescription>
          </DialogHeader>
          <form 
            onSubmit={resetPasswordForm.handleSubmit((data) => {
              if (resetPasswordAdmin) {
                resetAdminPasswordMutation.mutate({ id: resetPasswordAdmin.id, newPassword: data.newPassword });
              }
            })} 
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nieuw wachtwoord</Label>
              <Input 
                type="password" 
                {...resetPasswordForm.register("newPassword", { required: true, minLength: 6 })} 
              />
              <p className="text-xs text-muted-foreground">
                Minimaal 6 karakters. Gebruiker moet wachtwoord wijzigen bij volgende login.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setResetPasswordDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={resetAdminPasswordMutation.isPending}>
                {resetAdminPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Wachtwoord resetten
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={changePasswordDialogOpen} 
        onOpenChange={(open) => {
          if (admin?.mustChangePassword && !open) return;
          setChangePasswordDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {admin?.mustChangePassword ? "Wachtwoord wijzigen verplicht" : "Wachtwoord wijzigen"}
            </DialogTitle>
            <DialogDescription>
              {admin?.mustChangePassword 
                ? "Je moet je wachtwoord wijzigen voordat je verder kunt gaan."
                : "Wijzig je wachtwoord hieronder"}
            </DialogDescription>
          </DialogHeader>
          <form 
            onSubmit={changePasswordForm.handleSubmit((data) => {
              if (data.newPassword !== data.confirmPassword) {
                toast({ title: "Wachtwoorden komen niet overeen", variant: "destructive" });
                return;
              }
              changeOwnPasswordMutation.mutate({ 
                currentPassword: data.currentPassword, 
                newPassword: data.newPassword 
              });
            })} 
            className="space-y-4"
          >
            {!admin?.mustChangePassword && (
              <div className="space-y-2">
                <Label>Huidig wachtwoord</Label>
                <Input 
                  type="password" 
                  {...changePasswordForm.register("currentPassword", { required: !admin?.mustChangePassword })} 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nieuw wachtwoord</Label>
              <Input 
                type="password" 
                {...changePasswordForm.register("newPassword", { required: true, minLength: 6 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Bevestig nieuw wachtwoord</Label>
              <Input 
                type="password" 
                {...changePasswordForm.register("confirmPassword", { required: true })} 
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimaal 6 karakters
            </p>
            <DialogFooter>
              {!admin?.mustChangePassword && (
                <Button variant="outline" type="button" onClick={() => setChangePasswordDialogOpen(false)}>
                  Annuleren
                </Button>
              )}
              <Button type="submit" disabled={changeOwnPasswordMutation.isPending}>
                {changeOwnPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Wachtwoord wijzigen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
