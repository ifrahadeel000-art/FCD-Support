const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType,
  Events,
  ThreadAutoArchiveDuration,
} = require('discord.js');
const fs = require('fs');

// ─── Channel & Role IDs ───────────────────────────────────────────────────────
const LEAGUE_HOST_ROLE     = '1494366881916653690';
const LEAGUE_INFO_CHANNEL  = '1494707704021778443';
const SCREENSHOTS_CHANNEL  = '1494707660631572551';
const GIVEAWAY_PING_ROLE   = '1494342597840474193';
const EVENT_HOST_ROLE      = '1495436092470460596';
const EVENT_CHANNEL        = '1494729750785032344';
const GENERAL_CHAT         = '1494270116148412418';
const LEAGUES_PING_ROLE    = '1494342656845680751';
const LEAGUE_HOST_CHANNEL  = '1494706706549047356';
const GUIDELINES_CHANNEL   = '1494316420228714506';

// ─── Database helpers ─────────────────────────────────────────────────────────
const DB_PATH = './database.json';

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { events: {}, warns: {}, leagues: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { events: {}, warns: {}, leagues: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function generateId(prefix = 'ID') {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// ─── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Slash command definitions ────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('league')
    .setDescription('League management')
    .addSubcommand(sub =>
      sub
        .setName('host')
        .setDescription('Host a new league')
        .addStringOption(opt =>
          opt.setName('match_format').setDescription('Match format').setRequired(true)
            .addChoices(
              { name: '2v2', value: '2v2' },
              { name: '3v3', value: '3v3' },
              { name: '4v4', value: '4v4' },
            ))
        .addStringOption(opt =>
          opt.setName('match_type').setDescription('Type of match').setRequired(true)
            .addChoices(
              { name: 'Swift Game', value: 'swift' },
              { name: 'War Game',   value: 'war'   },
            ))
        .addStringOption(opt =>
          opt.setName('perks').setDescription('Match perks').setRequired(true)
            .addChoices(
              { name: 'Perks',    value: 'perks'    },
              { name: 'No Perks', value: 'no_perks' },
            ))
        .addStringOption(opt =>
          opt.setName('region').setDescription('Region').setRequired(true)
            .addChoices(
              { name: 'Europe',        value: 'Europe'        },
              { name: 'Asia',          value: 'Asia'          },
              { name: 'North America', value: 'North America' },
              { name: 'South America', value: 'South America' },
              { name: 'Oceania',       value: 'Oceania'       },
            )))
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Cancel a league by ID')
        .addStringOption(opt =>
          opt.setName('league_id').setDescription('The ID of the league to cancel').setRequired(true))),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription('End the current league (use inside the league thread)'),

  new SlashCommandBuilder()
    .setName('pingleagues')
    .setDescription('Ping the leagues role to notify members'),

  new SlashCommandBuilder()
    .setName('hostevent')
    .setDescription('Host an event')
    .addSubcommand(sub =>
      sub
        .setName('guess_number')
        .setDescription('Host a Guess the Number event')
        .addStringOption(opt =>  opt.setName('prize').setDescription('Prize for the winner').setRequired(true))
        .addStringOption(opt =>  opt.setName('funder').setDescription('Event funder').setRequired(true))
        .addStringOption(opt =>  opt.setName('host').setDescription('Event host name').setRequired(true))
        .addIntegerOption(opt => opt.setName('range_min').setDescription('Minimum of the number range').setRequired(true).setMinValue(1))
        .addIntegerOption(opt => opt.setName('range_max').setDescription('Maximum of the number range').setRequired(true).setMinValue(2)))
    .addSubcommand(sub =>
      sub
        .setName('roblox')
        .setDescription('Host a Roblox event')
        .addStringOption(opt => opt.setName('server_link').setDescription('Roblox private server link').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('Prize for the winner').setRequired(true))
        .addStringOption(opt => opt.setName('funder').setDescription('Event funder').setRequired(true))
        .addStringOption(opt => opt.setName('host').setDescription('Event host name').setRequired(true)))
    .addSubcommand(sub =>
      sub
        .setName('custom')
        .setDescription('Host a Custom event')
        .addStringOption(opt => opt.setName('name').setDescription('Event name').setRequired(true))
        .addStringOption(opt => opt.setName('how_it_works').setDescription('How the event works').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('Prize for the winner').setRequired(true))
        .addStringOption(opt => opt.setName('host').setDescription('Event host name').setRequired(true))
        .addStringOption(opt => opt.setName('funder').setDescription('Event funder').setRequired(true))),

  new SlashCommandBuilder()
    .setName('endevent')
    .setDescription('End an active event')
    .addStringOption(opt =>
      opt.setName('event_id').setDescription('The ID of the event to end').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>   opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warnings for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post league info and server guidelines to their channels (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);
  try {
    await c.application.commands.set(commands.map(cmd => cmd.toJSON()));
    console.log('Slash commands registered globally.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

// ─── Interaction router ───────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: 'An error occurred while processing your request.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ─── Message listener (guess the number) ─────────────────────────────────────
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.channelId !== GENERAL_CHAT) return;

  const db = loadDB();
  const activeEvent = Object.values(db.events).find(
    e => e.type === 'guess_number' && e.status === 'active' && e.started === true,
  );
  if (!activeEvent) return;

  const words   = message.content.trim().split(/\s+/);
  const numbers = words.filter(w => /^\d+$/.test(w));

  if (numbers.length > 2) {
    await message.reply('You cannot guess more than 2 numbers at once!').catch(() => {});
    return;
  }

  const correct = numbers.some(n => parseInt(n) === activeEvent.number);
  if (!correct) return;

  const winner = message.author;

  // Lock general chat immediately
  try {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false },
    );
  } catch (e) {
    console.error('Failed to lock general chat:', e);
  }

  // Update DB
  activeEvent.status  = 'won';
  activeEvent.winner  = winner.id;
  activeEvent.winnerTag = winner.tag;
  db.events[activeEvent.id] = activeEvent;
  saveDB(db);

  // DM the host
  try {
    const host = await client.users.fetch(activeEvent.hostUserId);
    await host.send(
      `**${winner.tag}** has won the event! The number **${activeEvent.number}** was guessed!\n` +
      `Event ID: \`${activeEvent.id}\`\nUse \`/endevent ${activeEvent.id}\` to officially end the event and unlock the chat.`,
    );
  } catch (e) {
    console.error('Failed to DM host:', e);
  }

  // DM the winner
  try {
    await winner.send(
      `Congratulations! You guessed the correct number (**${activeEvent.number}**) and won the event!\n` +
      `Prize: **${activeEvent.prize}**`,
    );
  } catch (e) {
    console.error('Failed to DM winner:', e);
  }
});

// ─── Command handler ──────────────────────────────────────────────────────────
async function handleCommand(interaction) {
  switch (interaction.commandName) {
    case 'league':     return handleLeagueCommand(interaction);
    case 'end':        return handleEndLeague(interaction);
    case 'pingleagues':return handlePingLeagues(interaction);
    case 'hostevent':  return handleHostEvent(interaction);
    case 'endevent':   return handleEndEvent(interaction);
    case 'warn':       return handleWarn(interaction);
    case 'warnings':   return handleWarnings(interaction);
    case 'setup':      return handleSetup(interaction);
  }
}

// ─── Button handler ───────────────────────────────────────────────────────────
async function handleButton(interaction) {
  const [action, id] = interaction.customId.split(':');
  switch (action) {
    case 'join_league':   return handleJoinLeague(interaction, id);
    case 'start_event':   return handleStartEventButton(interaction, id);
    case 'cancel_event':  return handleCancelEventButton(interaction, id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LEAGUE
// ─────────────────────────────────────────────────────────────────────────────

function buildLeagueEmbed(league) {
  const spotsLeft  = league.totalSpots - league.players.length;
  const typeLabel  = league.type === 'swift' ? 'Swift Game' : 'War Game';
  const perksLabel = league.perks === 'perks' ? 'Perks' : 'No Perks';
  const statusMap  = { open: 'Open', full: 'Full — In Progress', cancelled: 'Cancelled', ended: 'Ended' };
  const statusLabel = statusMap[league.status] ?? league.status;
  const color = { open: 0x57F287, full: 0xFEE75C, cancelled: 0xED4245, ended: 0x5865F2 }[league.status] ?? 0x2B2D31;

  return new EmbedBuilder()
    .setTitle('League Session')
    .setColor(color)
    .addFields(
      { name: 'League ID',    value: `\`${league.id}\``,          inline: true },
      { name: 'Host',         value: `<@${league.hostId}>`,        inline: true },
      { name: 'Status',       value: statusLabel,                  inline: true },
      { name: 'Match Format', value: league.format,                inline: true },
      { name: 'Match Type',   value: typeLabel,                    inline: true },
      { name: 'Perks',        value: perksLabel,                   inline: true },
      { name: 'Region',       value: league.region,                inline: true },
      { name: 'Players',      value: `${league.players.length}/${league.totalSpots}`, inline: true },
      { name: 'Spots Left',   value: `${spotsLeft}`,               inline: true },
    )
    .setFooter({ text: `Use /league cancel ${league.id} to cancel this league.` })
    .setTimestamp();
}

async function handleLeagueCommand(interaction) {
  const sub = interaction.options.getSubcommand();

  // ── host ──
  if (sub === 'host') {
    if (!interaction.member.roles.cache.has(LEAGUE_HOST_ROLE)) {
      return interaction.reply({ content: 'You do not have permission to host leagues.', ephemeral: true });
    }
    if (interaction.channelId !== LEAGUE_HOST_CHANNEL) {
      return interaction.reply({ content: `Leagues can only be hosted in <#${LEAGUE_HOST_CHANNEL}>.`, ephemeral: true });
    }

    const format = interaction.options.getString('match_format');
    const type   = interaction.options.getString('match_type');
    const perks  = interaction.options.getString('perks');
    const region = interaction.options.getString('region');
    const totalSpots = { '2v2': 4, '3v3': 6, '4v4': 8 }[format];
    const leagueId = generateId('LG');
    const db = loadDB();

    db.leagues[leagueId] = {
      id: leagueId,
      hostId:   interaction.user.id,
      hostTag:  interaction.user.tag,
      format,
      type,
      perks,
      region,
      totalSpots,
      players:  [],
      status:   'open',
      threadId: null,
      messageId: null,
      channelId: interaction.channelId,
      createdAt: Date.now(),
    };
    saveDB(db);

    const embed = buildLeagueEmbed(db.leagues[leagueId]);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_league:${leagueId}`)
        .setLabel('Join League')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ content: `<@&${LEAGUES_PING_ROLE}>`, embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();
    db.leagues[leagueId].messageId = msg.id;
    saveDB(db);
    return;
  }

  // ── cancel ──
  if (sub === 'cancel') {
    const leagueId = interaction.options.getString('league_id');
    const db = loadDB();
    const league = db.leagues[leagueId];

    if (!league) {
      return interaction.reply({ content: `No league found with ID \`${leagueId}\`.`, ephemeral: true });
    }
    const isHost  = league.hostId === interaction.user.id;
    const canCancel = isHost || interaction.member.roles.cache.has(LEAGUE_HOST_ROLE);
    if (!canCancel) {
      return interaction.reply({ content: 'You do not have permission to cancel this league.', ephemeral: true });
    }
    if (league.status === 'cancelled') {
      return interaction.reply({ content: 'This league is already cancelled.', ephemeral: true });
    }

    league.status = 'cancelled';
    saveDB(db);

    try {
      const ch  = await client.channels.fetch(league.channelId);
      const msg = await ch.messages.fetch(league.messageId);
      await msg.edit({ embeds: [buildLeagueEmbed(league)], components: [] });
    } catch (e) {
      console.error('Failed to update league message:', e);
    }

    return interaction.reply({ content: `League \`${leagueId}\` has been cancelled.` });
  }
}

async function handleJoinLeague(interaction, leagueId) {
  const db     = loadDB();
  const league = db.leagues[leagueId];

  if (!league) return interaction.reply({ content: 'League not found.', ephemeral: true });
  if (league.status !== 'open') return interaction.reply({ content: 'This league is no longer open for joining.', ephemeral: true });
  if (league.players.includes(interaction.user.id)) return interaction.reply({ content: 'You have already joined this league.', ephemeral: true });

  league.players.push(interaction.user.id);

  // If all spots filled — go full and open the private thread
  if (league.players.length >= league.totalSpots) {
    league.status = 'full';
    try {
      const ch = await client.channels.fetch(league.channelId);
      const thread = await ch.threads.create({
        name: `League ${league.id}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        type: ChannelType.PrivateThread,
        reason: `League ${league.id} — ${league.format} ${league.type}`,
      });
      league.threadId = thread.id;
      for (const playerId of league.players) {
        try { await thread.members.add(playerId); } catch (e) {}
      }
      await thread.send(
        `**League ${league.id} — All spots filled!**\n\n` +
        `Players: ${league.players.map(p => `<@${p}>`).join(', ')}\n\n` +
        `The private server link will be posted here by the host. Follow the host's instructions.\n` +
        `Host can use \`/end\` in this thread to close the league once it is finished.`,
      );
    } catch (e) {
      console.error('Failed to create league thread:', e);
    }
  }

  saveDB(db);

  // Update the embed + button
  try {
    const ch  = await client.channels.fetch(league.channelId);
    const msg = await ch.messages.fetch(league.messageId);
    const updatedRow = league.status === 'open'
      ? new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`join_league:${leagueId}`).setLabel('Join League').setStyle(ButtonStyle.Primary),
        )
      : new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`join_league:${leagueId}`).setLabel('League Full').setStyle(ButtonStyle.Secondary).setDisabled(true),
        );
    await msg.edit({ embeds: [buildLeagueEmbed(league)], components: [updatedRow] });
  } catch (e) {
    console.error('Failed to update league embed:', e);
  }

  const replyMsg = league.status === 'full'
    ? `You joined League \`${leagueId}\`. All spots are filled — check the private thread!`
    : `You joined League \`${leagueId}\`. Spots remaining: **${league.totalSpots - league.players.length}**.`;

  return interaction.reply({ content: replyMsg, ephemeral: true });
}

async function handleEndLeague(interaction) {
  if (!interaction.channel.isThread()) {
    return interaction.reply({ content: 'This command can only be used inside a league thread.', ephemeral: true });
  }

  const db = loadDB();
  const league = Object.values(db.leagues).find(l => l.threadId === interaction.channelId);
  if (!league) return interaction.reply({ content: 'No active league found for this thread.', ephemeral: true });

  const isHost    = league.hostId === interaction.user.id;
  const hasRole   = interaction.member.roles.cache.has(LEAGUE_HOST_ROLE);
  if (!isHost && !hasRole) {
    return interaction.reply({ content: 'Only the league host can end this league.', ephemeral: true });
  }
  if (league.status === 'ended') {
    return interaction.reply({ content: 'This league has already been ended.', ephemeral: true });
  }

  league.status = 'ended';
  saveDB(db);

  await interaction.reply({ content: `League \`${league.id}\` has ended. This thread will be archived.` });
  try { await interaction.channel.setArchived(true); } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  PING LEAGUES
// ─────────────────────────────────────────────────────────────────────────────

async function handlePingLeagues(interaction) {
  if (!interaction.member.roles.cache.has(LEAGUE_HOST_ROLE)) {
    return interaction.reply({ content: 'Only League Hosts can use this command.', ephemeral: true });
  }
  return interaction.reply({
    content: `<@&${LEAGUES_PING_ROLE}> A league is being hosted! Head to <#${LEAGUE_HOST_CHANNEL}> to join.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  HOST EVENT
// ─────────────────────────────────────────────────────────────────────────────

async function handleHostEvent(interaction) {
  if (!interaction.member.roles.cache.has(EVENT_HOST_ROLE)) {
    return interaction.reply({ content: 'You do not have permission to host events.', ephemeral: true });
  }
  if (interaction.channelId !== EVENT_CHANNEL) {
    return interaction.reply({ content: `Events can only be hosted in <#${EVENT_CHANNEL}>.`, ephemeral: true });
  }

  const sub     = interaction.options.getSubcommand();
  const eventId = generateId('EV');
  const db      = loadDB();

  // ── guess_number ──
  if (sub === 'guess_number') {
    const prize    = interaction.options.getString('prize');
    const funder   = interaction.options.getString('funder');
    const hostName = interaction.options.getString('host');
    const rangeMin = interaction.options.getInteger('range_min');
    const rangeMax = interaction.options.getInteger('range_max');

    if (rangeMin >= rangeMax) {
      return interaction.reply({ content: 'The minimum range must be less than the maximum range.', ephemeral: true });
    }

    const number = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;

    db.events[eventId] = {
      id: eventId,
      type: 'guess_number',
      status: 'pending',
      started: false,
      hostUserId: interaction.user.id,
      hostName,
      funder,
      prize,
      rangeMin,
      rangeMax,
      number,
      winner: null,
      winnerTag: null,
      messageId: null,
      createdAt: Date.now(),
    };
    saveDB(db);

    // DM host the secret number
    try {
      await interaction.user.send(
        `Your event \`${eventId}\` has been set up!\n` +
        `The secret number is: **${number}** (range: ${rangeMin}–${rangeMax})\n` +
        `Event ID: \`${eventId}\``,
      );
    } catch (e) {
      console.error('Failed to DM host:', e);
    }

    const embed = new EmbedBuilder()
      .setTitle('Guess The Number Event')
      .setColor(0xF1C40F)
      .addFields(
        { name: 'Event ID',  value: `\`${eventId}\``, inline: true },
        { name: 'Host',      value: hostName,          inline: true },
        { name: 'Funder',    value: funder,            inline: true },
        { name: 'Prize',     value: prize,             inline: true },
        { name: 'Range',     value: `${rangeMin} – ${rangeMax}`, inline: true },
        { name: 'Status',    value: 'Pending — Waiting for host to start', inline: true },
        {
          name: 'How Does the Event Work?',
          value:
            'In this event, you will try to guess a randomly selected number within the given range.\n' +
            'The first person to guess the correct number wins the prize for this event!\n' +
            '**You cannot say more than 2 numbers at once.**',
        },
        { name: 'Where to Participate', value: `<#${GENERAL_CHAT}>` },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`start_event:${eventId}`).setLabel('Start Event').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`cancel_event:${eventId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();
    db.events[eventId].messageId = msg.id;
    saveDB(db);
    return;
  }

  // ── roblox ──
  if (sub === 'roblox') {
    const serverLink = interaction.options.getString('server_link');
    const prize      = interaction.options.getString('prize');
    const funder     = interaction.options.getString('funder');
    const hostName   = interaction.options.getString('host');

    db.events[eventId] = {
      id: eventId,
      type: 'roblox',
      status: 'active',
      hostUserId: interaction.user.id,
      hostName,
      funder,
      prize,
      serverLink,
      messageId: null,
      createdAt: Date.now(),
    };
    saveDB(db);

    try {
      await interaction.user.send(
        `Your Roblox event has been created!\nEvent ID: \`${eventId}\`\nUse \`/endevent ${eventId}\` when it is over.`,
      );
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setTitle('Roblox Event')
      .setColor(0xFF4500)
      .addFields(
        { name: 'Event ID',    value: `\`${eventId}\``, inline: true },
        { name: 'Host',        value: hostName,          inline: true },
        { name: 'Funder',      value: funder,            inline: true },
        { name: 'Prize',       value: prize,             inline: true },
        { name: 'Server Link', value: serverLink },
        { name: 'Status',      value: 'Active' },
      )
      .setTimestamp();

    await interaction.reply({ content: `<@here> <@&${GIVEAWAY_PING_ROLE}>`, embeds: [embed] });
    const msg = await interaction.fetchReply();
    db.events[eventId].messageId = msg.id;
    saveDB(db);
    return;
  }

  // ── custom ──
  if (sub === 'custom') {
    const name       = interaction.options.getString('name');
    const howItWorks = interaction.options.getString('how_it_works');
    const prize      = interaction.options.getString('prize');
    const hostName   = interaction.options.getString('host');
    const funder     = interaction.options.getString('funder');

    db.events[eventId] = {
      id: eventId,
      type: 'custom',
      status: 'active',
      hostUserId: interaction.user.id,
      hostName,
      funder,
      prize,
      name,
      howItWorks,
      messageId: null,
      createdAt: Date.now(),
    };
    saveDB(db);

    try {
      await interaction.user.send(
        `Your custom event **${name}** has been created!\nEvent ID: \`${eventId}\`\nUse \`/endevent ${eventId}\` when it is over.`,
      );
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setTitle(`${name}`)
      .setColor(0x9B59B6)
      .addFields(
        { name: 'Event ID',    value: `\`${eventId}\``, inline: true },
        { name: 'Host',        value: hostName,          inline: true },
        { name: 'Funder',      value: funder,            inline: true },
        { name: 'Prize',       value: prize,             inline: true },
        { name: 'How It Works', value: howItWorks },
        { name: 'Status',      value: 'Active' },
      )
      .setTimestamp();

    await interaction.reply({ content: `<@here> <@&${GIVEAWAY_PING_ROLE}>`, embeds: [embed] });
    const msg = await interaction.fetchReply();
    db.events[eventId].messageId = msg.id;
    saveDB(db);
    return;
  }
}

async function handleStartEventButton(interaction, eventId) {
  const db    = loadDB();
  const event = db.events[eventId];

  if (!event) return interaction.reply({ content: 'Event not found.', ephemeral: true });
  if (event.hostUserId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the event host can start this event.', ephemeral: true });
  }
  if (event.started) return interaction.reply({ content: 'This event has already started.', ephemeral: true });
  if (event.status === 'cancelled') return interaction.reply({ content: 'This event was cancelled.', ephemeral: true });

  event.started = true;
  event.status  = 'active';
  saveDB(db);

  // Remove buttons from the event embed
  try {
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).spliceFields(
      interaction.message.embeds[0].fields.findIndex(f => f.name === 'Status'),
      1,
      { name: 'Status', value: 'Active — Accepting Guesses', inline: true },
    );
    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
  } catch (e) {
    console.error('Failed to update event embed:', e);
  }

  // Announce in general chat
  try {
    const generalCh = await client.channels.fetch(GENERAL_CHAT);
    await generalCh.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
    await generalCh.send(
      `<@here> <@&${GIVEAWAY_PING_ROLE}> **Guess The Number Event has started!**\n` +
      `Range: **${event.rangeMin} – ${event.rangeMax}** | Prize: **${event.prize}**\n` +
      `Start guessing! You cannot say more than 2 numbers at once.`,
    );
  } catch (e) {
    console.error('Failed to send general chat message:', e);
  }

  return interaction.reply({ content: `Event \`${eventId}\` has started! Players can guess in <#${GENERAL_CHAT}>.`, ephemeral: true });
}

async function handleCancelEventButton(interaction, eventId) {
  const db    = loadDB();
  const event = db.events[eventId];

  if (!event) return interaction.reply({ content: 'Event not found.', ephemeral: true });
  if (event.hostUserId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the event host can cancel this event.', ephemeral: true });
  }
  if (event.started) return interaction.reply({ content: 'The event has already started and cannot be cancelled with this button. Use `/endevent`.', ephemeral: true });

  event.status = 'cancelled';
  saveDB(db);

  try {
    await interaction.message.edit({ content: `Event \`${eventId}\` has been cancelled.`, embeds: [], components: [] });
  } catch (e) {}

  return interaction.reply({ content: `Event \`${eventId}\` has been cancelled.`, ephemeral: true });
}

async function handleEndEvent(interaction) {
  const eventId = interaction.options.getString('event_id');
  const db      = loadDB();
  const event   = db.events[eventId];

  if (!event) return interaction.reply({ content: `No event found with ID \`${eventId}\`.`, ephemeral: true });

  const isHost   = event.hostUserId === interaction.user.id;
  const hasRole  = interaction.member.roles.cache.has(EVENT_HOST_ROLE);
  if (!isHost && !hasRole) {
    return interaction.reply({ content: 'You do not have permission to end this event.', ephemeral: true });
  }
  if (event.status === 'ended') {
    return interaction.reply({ content: 'This event has already been ended.', ephemeral: true });
  }

  event.status = 'ended';
  saveDB(db);

  // Unlock general chat
  try {
    const generalCh = await client.channels.fetch(GENERAL_CHAT);
    await generalCh.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
    await generalCh.send(`The event **${eventId}** has officially ended. Thank you for participating!`);
  } catch (e) {
    console.error('Failed to unlock general chat:', e);
  }

  // DM the winner (guess_number only)
  if (event.type === 'guess_number' && event.winner) {
    try {
      const winner = await client.users.fetch(event.winner);
      await winner.send(
        `The event has officially ended. Congratulations on your win!\nPrize: **${event.prize}**`,
      );
    } catch (e) {}
  }

  return interaction.reply({
    content: `Event \`${eventId}\` has been officially ended. General chat has been unlocked.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  WARN / WARNINGS
// ─────────────────────────────────────────────────────────────────────────────

async function handleWarn(interaction) {
  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const db     = loadDB();

  if (!db.warns[target.id]) db.warns[target.id] = [];
  db.warns[target.id].push({ reason, moderator: interaction.user.id, timestamp: Date.now() });

  let warnCount     = db.warns[target.id].length;
  let timeoutMs     = 0;
  let actionLabel   = '';
  let resetNote     = '';

  if (warnCount >= 30) {
    timeoutMs   = 2 * 24 * 60 * 60 * 1000;
    actionLabel = '2 day timeout applied.';
    db.warns[target.id] = [];
    resetNote = 'Warning count has been reset after reaching 30.';
  } else if (warnCount >= 15) {
    timeoutMs   = 5 * 60 * 60 * 1000;
    actionLabel = '5 hour timeout applied.';
  } else if (warnCount >= 10) {
    timeoutMs   = 60 * 60 * 1000;
    actionLabel = '1 hour timeout applied.';
  } else if (warnCount >= 5) {
    timeoutMs   = 15 * 60 * 1000;
    actionLabel = '15 minute timeout applied.';
  }

  saveDB(db);

  if (timeoutMs > 0) {
    try {
      const member = await interaction.guild.members.fetch(target.id);
      await member.timeout(timeoutMs, reason);
    } catch (e) {
      console.error('Failed to apply timeout:', e);
    }
  }

  const displayCount = warnCount >= 30 ? 30 : warnCount;
  const embed = new EmbedBuilder()
    .setTitle('User Warned')
    .setColor(0xED4245)
    .addFields(
      { name: 'User',              value: `<@${target.id}>`,        inline: true },
      { name: 'Moderator',         value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Total Warnings',    value: `${displayCount}`,        inline: true },
      { name: 'Reason',            value: reason },
    )
    .setTimestamp();

  if (actionLabel) embed.addFields({ name: 'Action Taken', value: actionLabel });
  if (resetNote)   embed.addFields({ name: 'Note',         value: resetNote });

  return interaction.reply({ embeds: [embed] });
}

async function handleWarnings(interaction) {
  const target = interaction.options.getUser('user');
  const db     = loadDB();
  const warns  = db.warns[target.id] ?? [];

  const description = warns.length === 0
    ? 'No warnings on record.'
    : warns.map((w, i) =>
        `**${i + 1}.** ${w.reason} — <@${w.moderator}> — <t:${Math.floor(w.timestamp / 1000)}:R>`,
      ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`Warnings — ${target.tag}`)
    .setColor(0xE74C3C)
    .setDescription(description)
    .addFields({ name: 'Total Warnings', value: `${warns.length}` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP — post league info + server guidelines
// ─────────────────────────────────────────────────────────────────────────────

async function handleSetup(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // ── League Information ──
  try {
    const ch = await client.channels.fetch(LEAGUE_INFO_CHANNEL);
    const leagueEmbed = new EmbedBuilder()
      .setTitle('League Information')
      .setColor(0x2B2D31)
      .setDescription(
        'All information below must be followed. Everything is explained in detail to ensure clarity and understanding. ' +
        'Please read to the end to avoid misunderstandings and punishment.',
      )
      .addFields(
        {
          name: 'How to Join a League',
          value:
            `Once a <@&${LEAGUE_HOST_ROLE}> starts match marking, click the **"Join League"** button and you will be redirected to a private thread where the server link will be posted.\n` +
            `Join the match with the link and follow all instructions from the <@&${LEAGUE_HOST_ROLE}>.`,
        },
        {
          name: 'Swift League — Gameplay & Marking',
          value:
            `Swift League allows unlimited matches and each will be marked separately.\n` +
            `Screenshots will be posted in <#${SCREENSHOTS_CHANNEL}> with pings to all players who participated.`,
        },
        {
          name: 'War League — Gameplay & Marking',
          value:
            `War Leagues are played as a series, either **BO3** (First to 2) or **BO4** (First to 3). Teams remain the same throughout.\n` +
            `<@&${LEAGUE_HOST_ROLE}> must calculate Kills and Deaths for each player, then post the K/D ratios with pings to both teams.`,
        },
        {
          name: 'War League Statistics',
          value:
            '**Top Performer** — Player with the highest K/D overall.\n' +
            '**Top On Opposing Teams** — Player with the highest K/D on the opposing team.',
        },
        {
          name: 'Commands',
          value:
            '`/league host` — Host a new league.\n' +
            '`/league cancel <id>` — Cancel an existing league.\n' +
            '`/end` — End a league (use inside the league thread).',
        },
      )
      .setTimestamp();

    await ch.send({ embeds: [leagueEmbed] });
  } catch (e) {
    console.error('Failed to post league info:', e);
  }

  // ── Server Guidelines ──
  try {
    const ch = await client.channels.fetch(GUIDELINES_CHANNEL);
    const guidelinesEmbed = new EmbedBuilder()
      .setTitle('Server Guidelines')
      .setColor(0x2B2D31)
      .setDescription(
        'Please read and follow all server rules. Failure to comply will result in warnings and disciplinary action.',
      )
      .addFields(
        {
          name: 'Warning System',
          value: [
            '**5 warnings**   —  15 minute timeout',
            '**10 warnings**  —  1 hour timeout',
            '**15 warnings**  —  5 hour timeout',
            '**30 warnings**  —  2 day timeout',
            '',
            'After **30 warnings**, your warning count is automatically reset.',
          ].join('\n'),
        },
        {
          name: 'General Rules',
          value: [
            '• Respect all members at all times.',
            '• No harassment, hate speech, or discrimination of any kind.',
            '• No spamming or flooding channels.',
            '• Follow Discord\'s Terms of Service.',
            '• Do not share personal information of others.',
            '• Follow all moderator instructions.',
            '• Keep conversations in their appropriate channels.',
          ].join('\n'),
        },
        {
          name: 'League Rules',
          value: [
            '• Follow all instructions from League Hosts during matches.',
            '• Unsportsmanlike conduct will result in warnings.',
            '• Do not leave a match without informing the host.',
            '• Cheating of any kind results in immediate disqualification.',
          ].join('\n'),
        },
        {
          name: 'Event Rules',
          value: [
            '• Follow all event host instructions.',
            '• Do not guess more than 2 numbers at once in Guess the Number events.',
            '• Attempting to exploit events will result in disqualification and warnings.',
          ].join('\n'),
        },
      )
      .setTimestamp();

    await ch.send({ embeds: [guidelinesEmbed] });
  } catch (e) {
    console.error('Failed to post guidelines:', e);
  }

  return interaction.editReply({ content: 'League information and server guidelines have been posted successfully.' });
}

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
