# 📊 CSV Format Guide for Player Data Import

## 🎯 Overview
This guide explains how to format CSV files for importing player data into the auction system. Follow these rules exactly for successful data import.

## 📋 Required CSV Format

### **Column Headers (First Row)**
The CSV file MUST have exactly these 4 columns in this order:
```
Name,Tier,Description,Position
```

### **Column Details**

#### 1. **Name** (Required)
- Player's name or username
- **Type:** Text/String
- **Example:** `"Faker"`, `"Canyon"`, `"ShowMaker"`
- **Rules:** 
  - No special characters except hyphens and underscores
  - Maximum 50 characters
  - Must be unique

#### 2. **Tier** (Required)
- Player skill tier/rank
- **Type:** Text/String
- **Allowed Values:** Any valid League of Legends rank
- **Examples:** 
  - Standard ranks: `"Iron IV"`, `"Bronze II"`, `"Silver I"`, `"Gold III"`, `"Platinum II"`, `"Diamond I"`, `"Master"`, `"Grandmaster"`, `"Challenger"`
  - Simple tiers: `"S"`, `"A"`, `"B"`, `"C"`, `"D"`
  - Custom tiers: `"Pro"`, `"Semi-Pro"`, `"Amateur"`
- **Rules:**
  - Can be any text describing skill level
  - Recommended to use consistent format across all players
  - Case-sensitive (recommend consistent casing)

#### 3. **Description** (Required)
- Brief description of player's role/specialty
- **Type:** Text/String
- **Example:** `"Top lane tank specialist"`, `"Jungle carry player"`
- **Rules:**
  - Maximum 200 characters
  - Use clear, descriptive language
  - Avoid special characters like quotes within description

#### 4. **Position** (Required)
- Player's primary position
- **Type:** Text/String
- **Allowed Values:** `TOP`, `JGL`, `MID`, `ADC`, `SUPP`
- **Example:** `"TOP"`, `"JGL"`, `"MID"`
- **Rules:**
  - Must be uppercase
  - Must be one of the 5 allowed positions
  - Cannot be empty

## ✅ Correct CSV Example

```csv
Name,Tier,Description,Position
"Faker","Challenger","Legendary mid lane player with exceptional mechanics","MID"
"Canyon","Master","World-class jungler with perfect game sense","JGL"
"Khan","Diamond I","Aggressive top lane carry player","TOP"
"Ruler","Grandmaster","Consistent ADC with excellent positioning","ADC"
"Keria","Master","Support player with amazing playmaking ability","SUPP"
"Showmaker","Challenger","Creative mid lane assassin specialist","MID"
"Oner","Platinum I","Reliable jungle tank player","JGL"
"Zeus","Diamond II","Versatile top lane player","TOP"
"Gumayusi","Diamond I","High damage ADC player","ADC"
"BeryL","Gold I","Team fighting support specialist","SUPP"
```

## ❌ Common Mistakes to Avoid

### **Wrong Header Format:**
```csv
❌ Player Name,Skill Level,Bio,Role
❌ name,tier,description,position
❌ Name;Tier;Description;Position
```

### **Wrong Position Values:**
```csv
❌ "Faker","S","Mid lane player","Mid"
❌ "Canyon","S","Jungle player","Jungle"
❌ "Khan","A","Top player","Top Laner"
```

### **Wrong Tier Values:**
```csv
❌ "Faker","Master Tier","Mid lane player","MID"  (use "Master" not "Master Tier")
❌ "Canyon","rank 1","Jungle player","JGL"        (use proper rank name)
❌ "Khan","high elo","Top player","TOP"           (be specific with rank)
```

## 🔧 CSV Formatting Rules

### **1. Encoding**
- Use UTF-8 encoding
- Save as `.csv` file extension

### **2. Delimiters**
- Use comma (`,`) as field separator
- Use double quotes (`"`) around each field
- Use newline (`\n`) for row separation

### **3. Special Characters**
- If description contains commas, wrap in quotes: `"Player with high damage, good positioning"`
- If description contains quotes, escape them: `"Player known as ""The King"""`
- Avoid special characters in names: `✅ "T1_Faker"` `❌ "T1#Faker"`

### **4. Data Validation**
- No empty rows between data
- No empty fields (all 4 columns must have values)
- Consistent position naming across all rows

## 🤖 ChatGPT Prompt Template

Use this prompt when asking ChatGPT to create player data:

```
Create a CSV file with LoL player data using this exact format:

Headers: Name,Tier,Description,Position
- Name: Player name (text, max 50 chars)
- Tier: S/A/B/C/D (single uppercase letter)  
- Description: Player specialty (text, max 200 chars)
- Position: TOP/JGL/MID/ADC/SUPP (uppercase only)

Example format:
"Faker","S","Legendary mid lane player","MID"
"Canyon","S","World-class jungler","JGL"

Please create [X] players with varied tiers and positions.
```

## 📁 File Naming Convention

- **Format:** `players_YYYYMMDD.csv`
- **Example:** `players_20241011.csv`
- **Location:** Save in project root or designated import folder

## 🚀 Import Process

1. **Prepare CSV** following the format above
2. **Validate data** using the rules in this guide
3. **Save file** with proper encoding (UTF-8)
4. **Import via admin panel** in the auction application
5. **Verify import** by checking player list

## 💡 Pro Tips

- **Start small:** Test with 5-10 players first
- **Validate tiers:** Ensure good distribution (not all S-tier)
- **Balance positions:** Include players for all 5 positions
- **Clear descriptions:** Help coaches understand player strengths
- **Backup data:** Keep original CSV files for reference

---

## 📞 Support

If you encounter import errors:
1. Check CSV format against this guide
2. Validate all required fields are present
3. Ensure position values are exactly: TOP/JGL/MID/ADC/SUPP
4. Verify tier values are exactly: S/A/B/C/D

This format ensures seamless data import and proper functionality of the auction system! 🎯
