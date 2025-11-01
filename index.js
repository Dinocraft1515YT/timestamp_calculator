const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const { DateTime } = require('luxon');
const ct = require('countries-and-timezones');
const express = require('express');
const path = require('path');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('Error: DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in environment variables');
    process.exit(1);
}

const app = express();
const PORT = 5000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Timestamp Calculator Bot</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 600px;
                    margin: 100px auto;
                    padding: 20px;
                    text-align: center;
                    background: #f5f5f5;
                }
                h1 { color: #5865F2; }
                .links { margin-top: 30px; }
                a {
                    display: inline-block;
                    margin: 10px;
                    padding: 12px 24px;
                    background: #5865F2;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    transition: background 0.3s;
                }
                a:hover { background: #4752C4; }
            </style>
        </head>
        <body>
            <h1>⏰ Timestamp Calculator Bot</h1>
            <p>A Discord bot for calculating timestamps from date/time components</p>
            <div class="links">
                <a href="/terms.html">Terms of Service</a>
                <a href="/privacy.html">Privacy Policy</a>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server running on port ${PORT}`);
    console.log(`Terms of Service: http://localhost:${PORT}/terms.html`);
    console.log(`Privacy Policy: http://localhost:${PORT}/privacy.html`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

const commands = [
    new SlashCommandBuilder()
        .setName('timestamp')
        .setDescription('Calculate timestamp from date/time components and country timezone')
        .addStringOption(option =>
            option.setName('country')
                .setDescription('Country code (e.g., US, GB, JP) for timezone')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('Year (required for full date mode)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('month')
                .setDescription('Month (1-12, required for full date mode)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(12))
        .addIntegerOption(option =>
            option.setName('day')
                .setDescription('Day of month (1-31)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(31))
        .addIntegerOption(option =>
            option.setName('hour')
                .setDescription('Hour (0-23)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(23))
        .addIntegerOption(option =>
            option.setName('minute')
                .setDescription('Minute (0-59)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(59))
        .addIntegerOption(option =>
            option.setName('second')
                .setDescription('Second (0-59)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(59))
].map(command => command.toJSON());

async function registerCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

function getTimezoneFromCountry(countryCode) {
    try {
        const timezones = ct.getTimezonesForCountry(countryCode.toUpperCase());
        if (!timezones || timezones.length === 0) {
            return null;
        }
        return timezones[0].name;
    } catch (error) {
        return null;
    }
}

function calculateTimestamp(year, month, day, hour, minute, second, country) {
    const hasFullDate = year !== null && month !== null && day !== null;
    const hasTime = hour !== null && minute !== null && second !== null;

    if (!hasFullDate && !hasTime) {
        return { error: 'You must provide either:\n• Year, Month, and Day (full date mode)\n• Hour, Minute, and Second (time-only mode)' };
    }

    const timezone = getTimezoneFromCountry(country);
    if (!timezone) {
        return { error: `Invalid country code: **${country}**\nPlease use a valid country code (e.g., US, GB, JP, CA, AU)` };
    }

    try {
        let dateTime;
        
        if (hasFullDate) {
            const dateObj = {
                year: year,
                month: month,
                day: day,
                hour: hour || 0,
                minute: minute || 0,
                second: second || 0
            };
            dateTime = DateTime.fromObject(dateObj, { zone: timezone });
        } else {
            const now = DateTime.now().setZone(timezone);
            const dateObj = {
                year: now.year,
                month: now.month,
                day: day || now.day,
                hour: hour,
                minute: minute,
                second: second
            };
            dateTime = DateTime.fromObject(dateObj, { zone: timezone });
        }

        if (!dateTime.isValid) {
            return { error: `Invalid date/time: ${dateTime.invalidReason}\n${dateTime.invalidExplanation || ''}` };
        }

        const unixTimestamp = Math.floor(dateTime.toSeconds());
        const utcString = dateTime.toUTC().toISO();
        const localString = dateTime.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ');

        return {
            success: true,
            unixTimestamp,
            utcString,
            localString,
            timezone,
            dateTime
        };
    } catch (error) {
        return { error: `Error calculating timestamp: ${error.message}` };
    }
}

function createTimestampEmbed(result, mode = 'unix') {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⏰ Timestamp Calculator')
        .setTimestamp();

    if (mode === 'unix') {
        embed.addFields(
            { name: 'Unix Timestamp', value: `\`${result.unixTimestamp}\``, inline: false },
            { name: 'Local Time', value: result.localString, inline: true },
            { name: 'Timezone', value: result.timezone, inline: true },
            { name: 'UTC Time', value: result.utcString, inline: false }
        );
    } else if (mode === 'discord') {
        const discordFormats = [
            { name: 'Short Time', value: `<t:${result.unixTimestamp}:t>`, code: `<t:${result.unixTimestamp}:t>` },
            { name: 'Long Time', value: `<t:${result.unixTimestamp}:T>`, code: `<t:${result.unixTimestamp}:T>` },
            { name: 'Short Date', value: `<t:${result.unixTimestamp}:d>`, code: `<t:${result.unixTimestamp}:d>` },
            { name: 'Long Date', value: `<t:${result.unixTimestamp}:D>`, code: `<t:${result.unixTimestamp}:D>` },
            { name: 'Short Date/Time', value: `<t:${result.unixTimestamp}:f>`, code: `<t:${result.unixTimestamp}:f>` },
            { name: 'Long Date/Time', value: `<t:${result.unixTimestamp}:F>`, code: `<t:${result.unixTimestamp}:F>` },
            { name: 'Relative Time', value: `<t:${result.unixTimestamp}:R>`, code: `<t:${result.unixTimestamp}:R>` }
        ];

        let description = '**Discord Timestamp Formats:**\n\n';
        discordFormats.forEach(format => {
            description += `**${format.name}:** ${format.value}\n\`${format.code}\`\n\n`;
        });

        embed.setDescription(description);
    }

    return embed;
}

function createButtons(customId, currentMode = 'unix') {
    const toggleButton = currentMode === 'unix'
        ? new ButtonBuilder()
            .setCustomId(`discord_format_${customId}`)
            .setLabel('Discord Format')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📋')
        : new ButtonBuilder()
            .setCustomId(`regular_format_${customId}`)
            .setLabel('Regular Format')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔙');

    return new ActionRowBuilder()
        .addComponents(
            toggleButton,
            new ButtonBuilder()
                .setCustomId(`copy_unix_${customId}`)
                .setLabel('Copy Unix')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📄')
        );
}

const timestampCache = new Map();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready to calculate timestamps!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'timestamp') {
            const year = interaction.options.getInteger('year');
            const month = interaction.options.getInteger('month');
            const day = interaction.options.getInteger('day');
            const hour = interaction.options.getInteger('hour');
            const minute = interaction.options.getInteger('minute');
            const second = interaction.options.getInteger('second');
            const country = interaction.options.getString('country');

            const result = calculateTimestamp(year, month, day, hour, minute, second, country);

            if (result.error) {
                await interaction.reply({
                    content: `❌ **Error:**\n${result.error}`,
                    ephemeral: true
                });
                return;
            }

            const customId = `${interaction.user.id}_${Date.now()}`;
            timestampCache.set(customId, result);

            setTimeout(() => timestampCache.delete(customId), 15 * 60 * 1000);

            const embed = createTimestampEmbed(result, 'unix');
            const buttons = createButtons(customId);

            await interaction.reply({
                embeds: [embed],
                components: [buttons]
            });
        }
    } else if (interaction.isButton()) {
        const [action, , userId, timestamp] = interaction.customId.split('_');
        const customId = `${userId}_${timestamp}`;
        const cachedResult = timestampCache.get(customId);

        if (!cachedResult) {
            await interaction.reply({
                content: '❌ This timestamp has expired. Please run the command again.',
                ephemeral: true
            });
            return;
        }

        if (action === 'discord') {
            const embed = createTimestampEmbed(cachedResult, 'discord');
            await interaction.update({
                embeds: [embed],
                components: [createButtons(customId, 'discord')]
            });
        } else if (action === 'regular') {
            const embed = createTimestampEmbed(cachedResult, 'unix');
            await interaction.update({
                embeds: [embed],
                components: [createButtons(customId, 'unix')]
            });
        } else if (action === 'copy') {
            await interaction.reply({
                content: `📄 **Unix Timestamp:**\n\`\`\`\n${cachedResult.unixTimestamp}\n\`\`\`\nCopy the number above!`,
                ephemeral: true
            });
        }
    }
});

registerCommands().then(() => {
    client.login(DISCORD_TOKEN);
});
