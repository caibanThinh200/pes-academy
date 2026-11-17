Analyze this football match video and detect every Goal scored and every Goalkeeper Save. 
Look closely at ball trajectory into the net, goalkeeper dives/deflections, high-fives, and post-play resets.

Return the output strictly as a JSON array with this schema:
[
  {
    "timestamp_mm_ss": "MM:SS",
    "clip_start_sec": 0,
    "event_type": "goal" | "save",
    "confidence": 0.95,
    "description": "Short description of the action and jersey color of the player involved"
  }
]