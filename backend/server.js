const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
// Ensure this matches your frontend URL exactly
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Endpoint to Save a Log
app.post('/api/logs', async (req, res) => {
    try {
        const { uni_id, uni_name, action, details } = req.body;
        console.log("Backend received log attempt for:", uni_name);

        const { data, error } = await supabase.from('system_logs').insert([{ 
            university_id: uni_id, 
            university_name: uni_name, 
            action_type: action, 
            details: details 
        }]);
        
        if (error) {
            console.error("Supabase Insert Error:", error.message);
            return res.status(500).json({ error: error.message });
        }

        console.log("Log successfully saved to Supabase!");
        res.json({ success: true, data });
    } catch (err) {
        console.error("Server Crash Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to Fetch Logs
app.get('/api/logs', async (req, res) => {
    const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.listen(5000, () => console.log("Backend Command Center active on Port 5000"));