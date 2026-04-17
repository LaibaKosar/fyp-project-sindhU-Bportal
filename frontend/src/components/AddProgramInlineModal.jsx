import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import UfpGlassFormModal from './UfpGlassFormModal'
import { recordSystemLog } from '../utils/systemLogs'
import {
  DEGREE_LEVEL_TO_KEY,
  PROGRAM_CATEGORIES,
  DEGREE_LEVELS,
  DURATION_OPTIONS
} from '../data/programFormCatalog'

export default function AddProgramInlineModal({
  open,
  onClose,
  universityId,
  campusId,
  facultyId,
  departmentId,
  departmentName,
  onSaved,
  onError
}) {
  const [category, setCategory] = useState('')
  const [programName, setProgramName] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('Undergraduate')
  const [duration, setDuration] = useState(4)
  const [totalCreditHours, setTotalCreditHours] = useState('')
  const [saving, setSaving] = useState(false)

  const levelKey = DEGREE_LEVEL_TO_KEY[degreeLevel]
  const availablePrograms = useMemo(() => {
    if (!category || !levelKey || !PROGRAM_CATEGORIES[category]) return []
    return PROGRAM_CATEGORIES[category][levelKey] || []
  }, [category, levelKey])

  useEffect(() => {
    if (!open) return
    setCategory('')
    setProgramName('')
    setDegreeLevel('Undergraduate')
    setDuration(4)
    setTotalCreditHours('')
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!universityId || !campusId || !facultyId || !departmentId) return
    if (!category || !programName) {
      onError?.('Please select category and program name.')
      return
    }
    if (!degreeLevel || !duration || !totalCreditHours) {
      onError?.('Please fill duration and total credit hours.')
      return
    }
    setSaving(true)
    try {
      const programData = {
        university_id: universityId,
        campus_id: campusId,
        faculty_id: facultyId,
        department_id: departmentId,
        name: programName,
        category,
        degree_level: degreeLevel,
        duration_years: duration,
        total_credit_hours: parseInt(totalCreditHours, 10) || null
      }
      const { error } = await supabase.from('programs').insert(programData).select().single()
      if (error) throw error

      await recordSystemLog({
        universityId,
        actionType: 'PROGRAM_ADDED',
        details: `Added program: ${programName}${departmentName ? ` in ${departmentName}` : ''}`,
      })

      await onSaved?.()
      onClose()
    } catch (err) {
      onError?.(err.message || 'Could not save program.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <UfpGlassFormModal
      open={open}
      onClose={onClose}
      title="Add program"
      subtitle={departmentName ? `Department: ${departmentName}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Program category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setProgramName('')
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            required
          >
            <option value="">Select category</option>
            {Object.keys(PROGRAM_CATEGORIES).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Degree level <span className="text-red-500">*</span>
          </label>
          <select
            value={degreeLevel}
            onChange={(e) => {
              setDegreeLevel(e.target.value)
              setProgramName('')
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            required
          >
            {DEGREE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Program name <span className="text-red-500">*</span>
          </label>
          {!category ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              Select a category first
            </div>
          ) : (
            <select
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              required
            >
              <option value="">Select program</option>
              {availablePrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Duration (years) <span className="text-red-500">*</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              required
            >
              {DURATION_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y} {y === 1 ? 'year' : 'years'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Total credit hours <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={totalCreditHours}
              onChange={(e) => setTotalCreditHours(e.target.value)}
              min={0}
              placeholder="e.g. 130"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              required
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save program'
            )}
          </button>
        </div>
      </form>
    </UfpGlassFormModal>
  )
}
