export const recordActivity = async (uniId, uniName, action, details) => {
    try {
      await fetch('http://localhost:5000/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uni_id: uniId,
          uni_name: uniName,
          action: action,
          details: details
        })
      });
    } catch (err) {
      console.error("Logging failed:", err);
    }
  };