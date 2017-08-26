# wos

> Monitor traffic for unencrypted data (using [tshark](https://www.wireshark.org/docs/man-pages/tshark.html)) and display a dashboard in terminal.

<img src="./screenshot1.gif" width="750" />

# Install

```bash
npm install -g wos
```

# Usage

```bash
$ wos --help

  Monitor traffic for unencrypted data and display a dashboard.

    Usage
  $ wos -i <interface> [options]

    Info
      Capture interface is required. Use ifconfig command to find interfaces.

      SSID and password are required if using secured wifi such as WPA or WEP in order to decrypt packets.

      Wrap SSID and password in single quotes in order to escape special characters.

      After running wos, devices must send perform the EAPOL handshake in order for wos to decrypt their traffic. The handshake is initiated when the device connects or reconnects to the network.

    Options
      -i, --interface Capture interface
      -s, --ssid Wifi SSID
      -p, --pass Wifi password
      -c, --channel Wifi channel
      -n, --nomonitor Disable monitor mode
      -f, --format Format: dash (default), text
      -o, --outfile Output file
      -r, --readfile Read pcap file instead of monitoring

    Examples
      $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD' -o data.txt
```

You can simply just run `wos` command and it'll set up the options based on your current wifi connection.

```bash
$ wos
```

You can manually set the network capture interface card, as well as the SSID and password of the network. Those are required in order to decrypt packets on a secured network such as WPA. <br/>Remember, **you can only capture on the same network you are connected to.**

```bash
$ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD'
```

WOS supports:

- Retrieving credentials from unencrypted HTTP pages

- Retrieving credentials from unencrypted FTP logins

- Retrieving credentials from unencrypted SMTP logins

- Retrieving credentials from unencrypted POP logins

- Retrieving credentials from unencrypted IMAP logins

- Retrieving data from unencrypted TELNET sessions

# Requirements

- [Wireshark](https://www.wireshark.org/download.html)

- [tshark](https://www.wireshark.org/docs/man-pages/tshark.html) (comes with Wireshark)

- Wireless interface card that supports [monitor mode](https://en.wikipedia.org/wiki/Monitor_mode). Here's a [list](https://www.2600index.info/Links/26/3/www.aircrack-ng.org/doku.php%3Fid=compatibility_drivers.html).

# FAQ

- Q. My wireless card is stuck in monitor mode!

  - A. Kill `tshark` processes and toggle off and on the wireless card.

    ```bash
    pkill tshark
    ```

- Q. What does WOS mean?

  - A. It means "Wall of [Shetland](https://en.wikipedia.org/wiki/Shetland_sheep)"

    <sub><sup>[Wall of Sheep](https://www.wallofsheep.com/pages/wall-of-sheep) is a [trademark](http://tmsearch.uspto.gov/bin/showfield?f=doc&state=4810:8qpp6l.2.2) and couldn't use it.</sup></sub>

# License

MIT
