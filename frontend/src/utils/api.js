import { recordSystemLog } from './systemLogs'

/** @deprecated Prefer recordSystemLog from systemLogs.js */
export const recordActivity = async (uniId, uniName, action, details) => {
  await recordSystemLog({
    universityId: uniId,
    universityName: uniName,
    actionType: action,
    details,
  })
}