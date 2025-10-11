# 🤖 ChatGPT Prompt for Player Data Generation

## Quick Copy-Paste Prompt

```
Create a CSV file with League of Legends player data using this EXACT format:

HEADERS (first row): Name,Tier,Description,Position

CRITICAL FORMATTING RULES:
- Each field MUST be wrapped in double quotes: "field"
- Fields separated by commas: "Name","Tier","Description","Position"
- NO TABS - Use commas only!
- Tier: Any LoL rank (e.g., "Challenger", "Master", "Diamond I", "Platinum II", "Gold III") or simple letters (S, A, B, C, D)
- Position: Must be exactly one of: TOP, JGL, MID, ADC, SUPP (uppercase)
- MUST include MID position players!

CORRECT FORMAT EXAMPLE:
"Faker","Challenger","Legendary mid lane player with exceptional mechanics","MID"
"Canyon","Master","World-class jungler with perfect game sense","JGL"
"Khan","Diamond I","Aggressive top lane carry player","TOP"
"Ruler","Grandmaster","Consistent ADC with excellent positioning","ADC"
"Keria","Master","Support player with amazing playmaking ability","SUPP"

WRONG FORMAT (do not use):
❌ Clid	Challenger	Reliable shotcaller and consistent performer	TOP
❌ Clid,Challenger,Reliable shotcaller and consistent performer,TOP

CORRECT FORMAT:
✅ "Clid","Challenger","Reliable shotcaller and consistent performer","TOP"

Please create 20 players with:
- Varied tiers (use LoL ranks like "Challenger", "Master", "Diamond I", etc.)
- All 5 positions represented 
- Realistic LoL player names
- Each field wrapped in double quotes
- Comma separation between fields

Output should start with: Name,Tier,Description,Position
```

## ⚠️ FORMATTING REQUIREMENTS

Your CSV data should look like this:
```
Name	Tier	Description	Position
Faker	Challenger	Mechanical prodigy with fast reaction speed	TOP
```

Should be formatted as:
```
"Name","Tier","Description","Position"
"Faker","Challenger","Mechanical prodigy with fast reaction speed","TOP"
```

**Required changes:**
1. ✅ Add quotes around each field: `"Faker"`
2. ✅ Use commas instead of tabs: `"Faker","Challenger","Description","TOP"`
3. ✅ Add header row with quotes: `"Name","Tier","Description","Position"`

## Alternative Shorter Prompt

```
Create LoL player CSV data with format: Name,Tier,Description,Position

Requirements:
- Tier: Any LoL rank (e.g., "Challenger", "Master", "Diamond I") or simple letters (S/A/B/C/D)
- Position: TOP/JGL/MID/ADC/SUPP only  
- 20 players total
- Quote each field
- Realistic names and descriptions

Example: "PlayerName","Diamond II","Tank specialist","TOP"
```

## How to Fix Your Current CSV

Your current format:
```
Clid	Challenger	Reliable shotcaller and consistent performer	TOP
```

Should be changed to:
```
"Clid","Challenger","Reliable shotcaller and consistent performer","TOP"
```

**Changes needed:**
1. ✅ Add quotes around each field: `"Clid"`
2. ✅ Keep rank name: `"Challenger"` (any LoL rank is now accepted)
3. ✅ Use commas instead of tabs: `"Clid","Challenger","Description","TOP"`

## Customization Options

Replace `20 players` with your desired number:
- For small test: `5 players`
- For full roster: `50 players` 
- For tournament: `100 players`

Add specific requirements:
- `Include Korean player names`
- `Focus on aggressive playstyles`
- `Mix of rookie and veteran players`
- `Include international players`
