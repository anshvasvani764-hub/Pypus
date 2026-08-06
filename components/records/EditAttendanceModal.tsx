"use client";

import { useState } from "react";
import { X, Clock, CalendarDays, Save } from "lucide-react";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/members/types";
import { updateAttendanceRecord } from "@/app/actions/edit-records";

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  workspaceId: string;
  memberId: string;
  onSaved?: (updated: AttendanceRecord) => void;
}

function toISODate(iso: string): string {
  // "2026-02-08" stays as is; full datetime → extract date part
  return iso ? iso.slice(0, 10) : "";
}

function toTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function combineDateAndTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00.000Z`;
}

export function EditAttendanceModal({
  isOpen,
  onClose,
  record,
  workspaceId,
  memberId,
  onSaved,
}: EditAttendanceModalProps) {
  const [date, setDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state whenever a new record is selected
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);
  if (record && record.id !== lastRecordId) {
    setLastRecordId(record.id);
    setDate(toISODate(record.date));
    setCheckIn(toTime(record.check_in));
    setCheckOut(toTime(record.check_out));
    setStatus(record.status);
    setError(null);
  }

  if (!isOpen || !record) return null;

  async function handleSave() {
    if (!record) return;
    if (!date) {
      setError("Date is required");
      return;
    }
    setSaving(true);
    setError(null);

    const checkInIso = status === "present" ? combineDateAndTime(date, checkIn) : null;
    const checkOutIso = status === "present" ? combineDateAndTime(date, checkOut) : null;

    if (status === "present" && !checkInIso) {
      setSaving(false);
      setError("Check-in time is required for present records");
      return;
    }

    const result = await updateAttendanceRecord({
      workspaceId,
      memberId,
      recordId: record.id,
      date,
      checkIn: checkInIso,
      checkOut: checkOutIso,
      status,
    });

    setSaving(false);

    if (result.success && result.record) {
      onSaved?.(result.record);
      onClose();
    } else {
      setError(result.error || "Failed to update record");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Edit Attendance</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Date */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStatus("present")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border ${
                  status === "present"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                Present
              </button>
              <button
                onClick={() => setStatus("absent")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border ${
                  status === "absent"
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                Absent
              </button>
            </div>
          </div>

          {/* Check-in time (only when present) */}
          {status === "present" && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <Clock className="h-3.5 w-3.5" />
                Check-in
              </label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {error && (
            <p className="text-xs font-medium text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
