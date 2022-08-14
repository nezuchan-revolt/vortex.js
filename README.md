<div align="center">

<img src="https://i.kagchi.my.id/nezuko.png" alt="Logo" width="200px" height="200px" style="border-radius:50%"/>

# @nezuchan/vortex.js

**An implementation of the Revolt Voice API for Node.js, written in TypeScript.**

[![GitHub](https://img.shields.io/github/license/nezuchan/cordis-brokers)](https://github.com/nezuchan/cordis-brokers/blob/main/LICENSE)
[![Discord](https://discordapp.com/api/guilds/785715968608567297/embed.png)](https://nezu.my.id)

</div>


# Aknownledge
- The first revolt voice support in deno [voice-testing](https://github.com/mixtape-bot/voice-testing)
- DiscordJS [@discordjs/voice](https://discordjs/discord.js)
- Encoding, `@nezuchan/vortex.js` only implements voice server communication, not voice handling itself, so it only accepts Opus frames and you have set up an encoder yourself, libav/ffmpeg or anything else.