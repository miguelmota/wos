# wos

> Monitor traffic for unencrypted data (using [tshark](https://www.wireshark.org/docs/man-pages/tshark.html)) and display a dashboard in terminal.

<img src="./screenshot.png" width="700" />

# Install

```bash
npm install -g wos
```

# Usage

```bash
$ wos --help

  Monitor traffic for unencrypted data and display a dashboard.

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
    $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD' -o data.txt
```

WOS supports:

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

Q. What does WOS mean?

It means [W̶a̶l̶l̶ ̶o̶f̶ ̶S̶h̶e̶e̶p̶](https://www.wallofsheep.com/pages/wall-of-sheep) Wall of [Shetland](https://en.wikipedia.org/wiki/Shetland_sheep)

<small>Wall of Sheep</small> is a [trademark](http://tmsearch.uspto.gov/bin/showfield?f=doc&state=4810:8qpp6l.2.2)

```bash
pkill tshark
```

# License

MIT
