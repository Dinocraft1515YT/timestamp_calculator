# Discord Timestamp Bot

## Overview
A Discord bot that calculates Unix timestamps from date/time components and converts them based on the user's country timezone. The bot provides an interactive embed interface with buttons to convert timestamps to Discord format or copy the raw Unix number.

## Recent Changes
- October 26, 2025: Added button toggle functionality (Discord Format ↔ Regular Format) and DM support
- October 26, 2025: Fixed country code recognition by replacing broken country-timezone with countries-and-timezones library
- October 26, 2025: Initial project setup with Discord.js, Luxon for timezone handling

## Features
- `/timestamp` slash command with optional parameters:
  - `year`, `month`, `day` - Full date mode
  - `hour`, `minute`, `second`, `day` (optional) - Time-only mode
  - `country` - Required for timezone conversion (supports all ISO country codes: US, GB, ES, JP, etc.)
- Works in both servers and DMs
- Interactive embed messages displaying calculated timestamps
- Toggle button controls:
  - "Discord Format" - Shows all Discord timestamp format variations with previews
  - "Regular Format" - Returns to the standard Unix timestamp view
  - "Copy Unix" - Provides raw Unix timestamp for easy copying
- Button toggle remembers your view preference during the session

## Project Architecture
- **Technology Stack**: Node.js with Discord.js v14
- **Dependencies**:
  - `discord.js` - Discord bot framework
  - `luxon` - Timezone and datetime handling
  - `countries-and-timezones` - Country to timezone mapping
- **File Structure**:
  - `index.js` - Main bot file with command handlers and button interactions
  - `.env` - Environment variables (DISCORD_TOKEN, DISCORD_CLIENT_ID)

## Setup Instructions
1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and copy the bot token
3. Copy the application ID (Client ID)
4. Set environment secrets: `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`
5. Invite the bot to your server with the following permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
6. Run the bot using the configured workflow
