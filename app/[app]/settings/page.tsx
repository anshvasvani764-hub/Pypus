'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  Bell,
  CreditCard,
  ChevronRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
} from 'lucide-react'

export default function SettingsPage() {
  const { app } = useParams<{ app: string }>()

  const [businessName, setBusinessName] = useState('Flow Fitness Studio')
  const [industry, setIndustry] = useState('Health & Fitness')

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    taskUpdates: true,
    weeklyDigest: false,
  })

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your workspace preferences, team, notifications, and subscription plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Workspace Profile</h2>
                <p className="text-xs text-gray-500">Update your business details and category</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Industry Type
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Health & Fitness">Health & Fitness</option>
                  <option value="Technology & SaaS">Technology & SaaS</option>
                  <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Education & Coaching">Education & Coaching</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Changes save automatically</span>
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <Check size={14} /> Saved
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Team & Roles</h2>
                <p className="text-xs text-gray-500">Manage members and permission levels</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Invite teammates, assign role permissions (Admin, Member, Viewer), and manage active workspace access.
            </p>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                    AK
                  </div>
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                    PS
                  </div>
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                    +2
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">4 Active Members</p>
                  <p className="text-[11px] text-gray-500">Owner & Admin seats assigned</p>
                </div>
              </div>
              <ShieldCheck size={18} className="text-gray-400" />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href={`/${app}/workspace`}
              className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors group"
            >
              <span>Manage My Team</span>
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                <p className="text-xs text-gray-500">Configure alert preferences and frequency</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Email Alerts</p>
                  <p className="text-xs text-gray-500">Important system and security notifications</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('emailAlerts')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.emailAlerts ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      notifications.emailAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Task Updates</p>
                  <p className="text-xs text-gray-500">Get notified when workflow status changes</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('taskUpdates')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.taskUpdates ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      notifications.taskUpdates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Weekly AI Digest</p>
                  <p className="text-xs text-gray-500">Receive summary reports from Pypus assistant</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('weeklyDigest')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.weeklyDigest ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      notifications.weeklyDigest ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Billing & Plan</h2>
                  <p className="text-xs text-gray-500">Subscription status and billing details</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Pro Plan
              </span>
            </div>

            <div className="space-y-3 bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Current Billing Cycle</span>
                <span className="font-semibold text-gray-900">$29 / month</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Next Renewal Date</span>
                <span className="font-semibold text-gray-900">Aug 28, 2026</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full w-2/3" />
              </div>
              <p className="text-[11px] text-gray-500 text-right">65% of monthly tokens used</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Billing History
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>Upgrade Plan</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
