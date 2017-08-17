# Wall of Sheep

> Monitor traffic for sheep and display a [Wall of Sheep](https://www.wallofsheep.com/pages/wall-of-sheep) dashboard.

<img src="./screenshot.png" width="700" />

# Install

```bash
npm install -g wos
```

# Usage

```bash
$ wos --help
 _       _____    __    __       ____  ______   _____ __  __________________
| |     / /   |  / /   / /      / __ \/ ____/  / ___// / / / ____/ ____/ __ \
| | /| / / /| | / /   / /      / / / / /_      \__ \/ /_/ / __/ / __/ / /_/ /
| |/ |/ / ___ |/ /___/ /___   / /_/ / __/     ___/ / __  / /___/ /___/ ____/
|__/|__/_/  |_/_____/_____/   \____/_/       /____/_/ /_/_____/_____/_/

  Monitor traffic for sheep and display a Wall of Sheep dashboard.

  Usage
    $ wos <options>

  Important
    Use single quotes in order to escape special characters.

  Options
    -i, --interface Capture interface
    -s, --ssid Wifi SSID
    -p, --pass Wifi password
    -n, --no-monitor Disable monitor mode
    -f, --format Format: dash (default), text
    -o, --outfile Output file

  Examples
    $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD' -o sheep.txt
```

Currently, this Wall of Sheep only supports:

- Retrieving logins from unencrypted HTTP pages

- Retrieving credentials from unencrypted FTP logins

- Retrieving credentials from unencrypted SMTP logins

- Retrieving credentials from unencrypted POP logins

- Retrieving credentials from unencrypted IMAP logins

# Requirements

- [tshark - Dump and analyze network traffic](https://www.wireshark.org/docs/man-pages/tshark.html)

- Wireless interface card that supports monitor mode

# FAQ

Q. My wireless card is stuck in monitor mode!

A. Kill `tshark` processes and toggle off and on the wireless card.

```bash
pkill tshark
```

# License

MIT
